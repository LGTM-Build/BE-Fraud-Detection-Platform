import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { FraudDispatchService } from "../integrations/fraud/fraud-dispatch.service";
import {
  generateExpenseId,
  generatePurchaseId,
} from "../../core/utils/business-id";

type ProcurementImportMapping = Partial<
  Record<keyof ProcurementImportRow, string>
>;
type ExpenseImportMapping = Partial<Record<keyof ExpenseImportRow, string>>;

type Actor = {
  userId: string;
  companyId: string;
};

type ProcurementImportRow = {
  purchaseId?: string;
  purchaseDate?: string;
  vendorName?: string;
  itemDescription?: string;
  department?: string;
  amountTotal?: string | number;
  procurementMethod?: string;
  employeeExternalRef?: string;
};

type ExpenseImportRow = {
  expenseId?: string;
  expenseDate?: string;
  department?: string;
  description?: string;
  employeeExternalRef?: string;
  amountTotal?: string | number;
  category?: string;
  merchant?: string;
};

function parseNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readRowsFromFile<T>(filePath: string): T[] {
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
    return XLSX.utils.sheet_to_json<T>(worksheet, { defval: "" });
  }

  throw new AppError("Unsupported file type", 400, "UNSUPPORTED_FILE_TYPE");
}

function getMappedValue<T extends Record<string, any>>(
  row: Record<string, any>,
  fieldName: keyof T,
  mapping?: Partial<Record<keyof T, string>>,
) {
  const mappedColumn = mapping?.[fieldName];

  if (mappedColumn && row[mappedColumn] !== undefined) {
    return row[mappedColumn];
  }

  return row[fieldName as string];
}

function normalizeProcurementRow(
  row: Record<string, any>,
  mapping?: ProcurementImportMapping,
): ProcurementImportRow {
  return {
    purchaseId: getMappedValue<ProcurementImportRow>(
      row,
      "purchaseId",
      mapping,
    ),
    purchaseDate: getMappedValue<ProcurementImportRow>(
      row,
      "purchaseDate",
      mapping,
    ),
    vendorName: getMappedValue<ProcurementImportRow>(
      row,
      "vendorName",
      mapping,
    ),
    itemDescription: getMappedValue<ProcurementImportRow>(
      row,
      "itemDescription",
      mapping,
    ),
    department: getMappedValue<ProcurementImportRow>(
      row,
      "department",
      mapping,
    ),
    amountTotal: getMappedValue<ProcurementImportRow>(
      row,
      "amountTotal",
      mapping,
    ),
    procurementMethod: getMappedValue<ProcurementImportRow>(
      row,
      "procurementMethod",
      mapping,
    ),
    employeeExternalRef: getMappedValue<ProcurementImportRow>(
      row,
      "employeeExternalRef",
      mapping,
    ),
  };
}

function normalizeExpenseRow(
  row: Record<string, any>,
  mapping?: ExpenseImportMapping,
): ExpenseImportRow {
  return {
    expenseId: getMappedValue<ExpenseImportRow>(row, "expenseId", mapping),
    expenseDate: getMappedValue<ExpenseImportRow>(row, "expenseDate", mapping),
    department: getMappedValue<ExpenseImportRow>(row, "department", mapping),
    description: getMappedValue<ExpenseImportRow>(row, "description", mapping),
    employeeExternalRef: getMappedValue<ExpenseImportRow>(
      row,
      "employeeExternalRef",
      mapping,
    ),
    amountTotal: getMappedValue<ExpenseImportRow>(row, "amountTotal", mapping),
    category: getMappedValue<ExpenseImportRow>(row, "category", mapping),
    merchant: getMappedValue<ExpenseImportRow>(row, "merchant", mapping),
  };
}

function normalizeProcurementMethod(
  value?: string,
):
  | "pengadaan_langsung"
  | "tender_terbuka"
  | "tender_tertutup"
  | "e_purchasing"
  | "rfp"
  | "lainnya" {
  const method = (value || "").trim().toLowerCase();

  if (method === "pengadaan_langsung") return "pengadaan_langsung";
  if (method === "tender_terbuka") return "tender_terbuka";
  if (method === "tender_tertutup") return "tender_tertutup";
  if (method === "e_purchasing") return "e_purchasing";
  if (method === "rfp") return "rfp";

  return "lainnya";
}

function normalizeExpenseCategory(
  value?: string,
):
  | "entertainment"
  | "transport"
  | "office_supply"
  | "meals"
  | "vehicle"
  | "training"
  | "others" {
  const category = (value || "").trim().toLowerCase();

  if (category === "entertainment") return "entertainment";
  if (category === "transport") return "transport";
  if (category === "office_supply") return "office_supply";
  if (category === "meals") return "meals";
  if (category === "vehicle") return "vehicle";
  if (category === "training") return "training";

  return "others";
}

export class ImportService {
  static async importProcurements(
    actor: Actor,
    filePath: string,
    dispatchMl = false,
    mapping?: ProcurementImportMapping,
  ) {
    const rawRows = readRowsFromFile<Record<string, any>>(filePath);
    const rows = rawRows.map((row) => normalizeProcurementRow(row, mapping));

    const createdIds: string[] = [];

    if (!rows.length) {
      throw new AppError("File is empty", 400, "EMPTY_FILE");
    }

    const successes: Array<{
      rowNumber: number;
      id: string;
      purchaseId: string | null;
    }> = [];
    const errors: Array<{
      rowNumber: number;
      purchaseId?: string;
      message: string;
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

        if (!row.vendorName) {
          throw new AppError("vendorName is required", 400, "VALIDATION_ERROR");
        }

        if (!row.itemDescription) {
          throw new AppError(
            "itemDescription is required",
            400,
            "VALIDATION_ERROR",
          );
        }

        const amountTotal = parseNumber(row.amountTotal);
        if (amountTotal === null) {
          throw new AppError("amountTotal is invalid", 400, "VALIDATION_ERROR");
        }

        const purchaseDate = parseDate(row.purchaseDate);
        if (!purchaseDate) {
          throw new AppError(
            "purchaseDate is invalid",
            400,
            "VALIDATION_ERROR",
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

        const purchaseId =
          row.purchaseId || (await generatePurchaseId(actor.companyId));

        const created = await prisma.procurementTransaction.create({
          data: {
            companyId: actor.companyId,
            employeeId,
            purchaseId,
            purchaseDate,
            vendorName: row.vendorName,
            itemDescription: row.itemDescription,
            department: row.department || null,
            amountTotal,
            procurementMethod: normalizeProcurementMethod(
              row.procurementMethod,
            ),
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        });

        createdIds.push(created.id);

        successes.push({
          rowNumber,
          id: created.id,
          purchaseId: created.purchaseId,
        });
      } catch (error: any) {
        errors.push({
          rowNumber,
          purchaseId: row.purchaseId || undefined,
          message: error.message || "Unknown import error",
        });
      }
    }

    let aiDispatch: any = null;

    if (dispatchMl && createdIds.length > 0) {
      try {
        aiDispatch = await FraudDispatchService.dispatchProcurements(
          actor,
          createdIds,
          "import",
        );
      } catch (error: any) {
        aiDispatch = {
          success: false,
          message: error.message ?? "Failed to dispatch procurements to AI",
        };
      }
    }

    return {
      filename: path.basename(filePath),
      totalRows: rows.length,
      successRows: successes.length,
      failedRows: errors.length,
      successes,
      errors,
      aiDispatch,
    };
  }

  static async importExpenses(
    actor: Actor,
    filePath: string,
    dispatchMl = false,
    mapping?: ExpenseImportMapping,
  ) {
    const rawRows = readRowsFromFile<Record<string, any>>(filePath);
    const rows = rawRows.map((row) => normalizeExpenseRow(row, mapping));

    const createdIds: string[] = [];

    if (!rows.length) {
      throw new AppError("File is empty", 400, "EMPTY_FILE");
    }

    const successes: Array<{
      rowNumber: number;
      id: string;
      expenseId: string | null;
    }> = [];
    const errors: Array<{
      rowNumber: number;
      expenseId?: string;
      message: string;
    }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        if (!row.expenseDate) {
          throw new AppError(
            "expenseDate is required",
            400,
            "VALIDATION_ERROR",
          );
        }

        if (!row.description) {
          throw new AppError(
            "description is required",
            400,
            "VALIDATION_ERROR",
          );
        }

        if (!row.employeeExternalRef) {
          throw new AppError(
            "employeeExternalRef is required",
            400,
            "VALIDATION_ERROR",
          );
        }

        const amountTotal = parseNumber(row.amountTotal);
        if (amountTotal === null) {
          throw new AppError("amountTotal is invalid", 400, "VALIDATION_ERROR");
        }

        const expenseDate = parseDate(row.expenseDate);
        if (!expenseDate) {
          throw new AppError("expenseDate is invalid", 400, "VALIDATION_ERROR");
        }

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

        const expenseId =
          row.expenseId || (await generateExpenseId(actor.companyId));

        const created = await prisma.expense.create({
          data: {
            companyId: actor.companyId,
            employeeId: employee.id,
            expenseId,
            expenseDate,
            description: row.description,
            category: normalizeExpenseCategory(row.category),
            merchant: row.merchant || null,
            amountTotal,
            department: row.department || employee.department || null,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        });

        createdIds.push(created.id);

        successes.push({
          rowNumber,
          id: created.id,
          expenseId: created.expenseId,
        });
      } catch (error: any) {
        errors.push({
          rowNumber,
          expenseId: row.expenseId || undefined,
          message: error.message || "Unknown import error",
        });
      }
    }

    let aiDispatch: any = null;

    if (dispatchMl && createdIds.length > 0) {
      try {
        aiDispatch = await FraudDispatchService.dispatchExpenses(
          actor,
          createdIds,
          "import",
        );
      } catch (error: any) {
        aiDispatch = {
          success: false,
          message: error.message ?? "Failed to dispatch expenses to AI",
        };
      }
    }

    return {
      filename: path.basename(filePath),
      totalRows: rows.length,
      successRows: successes.length,
      failedRows: errors.length,
      successes,
      errors,
      aiDispatch,
    };
  }
}
