import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { AuditLogService } from "../audit-logs/audit-log.service";
import { FraudDispatchService } from "../integrations/fraud/fraud-dispatch.service";

type ImportActor = {
  userId: string;
  companyId: string;
};

type ProcurementImportRow = {
  purchaseId?: string;
  poNumber?: string;
  purchaseDate?: string;
  vendorExternalRef?: string;
  employeeExternalRef?: string;
  itemId?: string;
  itemDescription?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  amountTotal?: string | number;
  department?: string;
  method?: string;
  approvalDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  location?: string;
  contractId?: string;
  contractDate?: string;
  paymentDate?: string;
};

function normalizeMethod(
  method?: string,
):
  | "pengadaan_langsung"
  | "tender_terbuka"
  | "tender_tertutup"
  | "e_purchasing"
  | "rfp"
  | "lainnya" {
  const value = (method || "").trim().toLowerCase();

  if (value === "pengadaan_langsung") return "pengadaan_langsung";
  if (value === "tender_terbuka") return "tender_terbuka";
  if (value === "tender_tertutup") return "tender_tertutup";
  if (value === "e_purchasing") return "e_purchasing";
  if (value === "rfp") return "rfp";

  return "lainnya";
}

function parseNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function readRowsFromFile(filePath: string): ProcurementImportRow[] {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    const content = fs.readFileSync(filePath, "utf-8");
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  if (ext === ".xlsx") {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json<ProcurementImportRow>(worksheet, {
      defval: "",
    });
  }

  throw new AppError("Unsupported file type", 400, "UNSUPPORTED_FILE_TYPE");
}

export class ImportService {
  static async importProcurementFile(
    actor: ImportActor,
    filePath: string,
    dispatchFraud = false,
  ) {
    const rows = readRowsFromFile(filePath);

    if (!rows.length) {
      throw new AppError("File is empty", 400, "EMPTY_FILE");
    }

    const errors: Array<{
      rowNumber: number;
      purchaseId?: string;
      message: string;
    }> = [];

    const successes: Array<{
      rowNumber: number;
      procurementId: string;
      purchaseId: string | null;
    }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        if (!row.purchaseDate) {
          throw new AppError(
            "purchaseDate is required",
            400,
            "VALIDATION_ERROR",
          );
        }

        if (!row.vendorExternalRef) {
          throw new AppError(
            "vendorExternalRef is required",
            400,
            "VALIDATION_ERROR",
          );
        }

        if (
          row.amountTotal === undefined ||
          row.amountTotal === null ||
          row.amountTotal === ""
        ) {
          throw new AppError(
            "amountTotal is required",
            400,
            "VALIDATION_ERROR",
          );
        }

        const vendor = await prisma.vendor.findFirst({
          where: {
            companyId: actor.companyId,
            externalRef: row.vendorExternalRef,
          },
        });

        if (!vendor) {
          throw new AppError(
            `Vendor with externalRef '${row.vendorExternalRef}' not found`,
            404,
            "VENDOR_NOT_FOUND",
          );
        }

        let employeeId: string | null = null;

        if (row.employeeExternalRef) {
          const employee = await prisma.employee.findFirst({
            where: {
              companyId: actor.companyId,
              externalRef: row.employeeExternalRef,
            },
          });

          if (!employee) {
            throw new AppError(
              `Employee with externalRef '${row.employeeExternalRef}' not found`,
              404,
              "EMPLOYEE_NOT_FOUND",
            );
          }

          employeeId = employee.id;
        }

        const purchaseDate = parseDate(row.purchaseDate);
        if (!purchaseDate) {
          throw new AppError(
            "purchaseDate is invalid",
            400,
            "VALIDATION_ERROR",
          );
        }

        const amountTotal = parseNumber(row.amountTotal);
        if (amountTotal === null) {
          throw new AppError("amountTotal is invalid", 400, "VALIDATION_ERROR");
        }

        const quantity = parseNumber(row.quantity);
        const unitPrice = parseNumber(row.unitPrice);

        const procurement = await prisma.procurementTransaction.create({
          data: {
            companyId: actor.companyId,
            vendorId: vendor.id,
            employeeId,
            purchaseId: row.purchaseId || null,
            poNumber: row.poNumber || null,
            purchaseDate,
            itemId: row.itemId || null,
            itemDescription: row.itemDescription || null,
            quantity,
            unitPrice,
            amountTotal,
            department: row.department || null,
            method: normalizeMethod(row.method),
            approvalDate: parseDate(row.approvalDate),
            invoiceNumber: row.invoiceNumber || null,
            invoiceDate: parseDate(row.invoiceDate),
            location: row.location || null,
            contractId: row.contractId || null,
            contractDate: parseDate(row.contractDate),
            paymentDate: parseDate(row.paymentDate),
            createdBy: actor.userId,
            metadata: {
              source: "file_import",
              vendorExternalRef: row.vendorExternalRef,
              employeeExternalRef: row.employeeExternalRef || null,
            },
          },
        });

        if (dispatchFraud) {
          try {
            await FraudDispatchService.dispatchProcurement(
              procurement.id,
              "create_procurement",
              "supervised",
            );
          } catch {
            // dibiarkan gagal per dispatch, tidak membatalkan import row
          }
        }

        successes.push({
          rowNumber,
          procurementId: procurement.id,
          purchaseId: procurement.purchaseId,
        });
      } catch (error: any) {
        errors.push({
          rowNumber,
          purchaseId: row.purchaseId || undefined,
          message: error.message || "Unknown import error",
        });
      }
    }

    await AuditLogService.create({
      companyId: actor.companyId,
      userId: actor.userId,
      action: "import_procurement_file",
      targetType: "procurement_transaction",
      targetId: null,
      note: "Imported procurement transactions from file",
      metadata: {
        filename: path.basename(filePath),
        totalRows: rows.length,
        successRows: successes.length,
        failedRows: errors.length,
        dispatchFraud,
      },
    });

    return {
      filename: path.basename(filePath),
      totalRows: rows.length,
      successRows: successes.length,
      failedRows: errors.length,
      successes,
      errors,
    };
  }
}
