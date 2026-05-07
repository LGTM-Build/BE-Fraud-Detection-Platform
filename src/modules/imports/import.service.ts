import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { parse } from "csv-parse/sync";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { FraudDispatchService } from "../integrations/fraud/fraud-dispatch.service";
import {
  generateExpenseId,
  generatePurchaseId,
} from "../../core/utils/business-id";

type Actor = {
  userId: string;
  companyId: string;
};

type ProcurementImportRow = {
  purchaseId?: string;
  purchaseDate?: string | number | Date;
  vendorName?: string;
  itemDescription?: string;
  department?: string;
  amountTotal?: string | number;
  procurementMethod?: string;
  employeeExternalRef?: string;
};

type ExpenseImportRow = {
  expenseId?: string;
  expenseDate?: string | number | Date;
  department?: string;
  description?: string;
  employeeExternalRef?: string;
  amountTotal?: string | number;
  category?: string;
  merchant?: string;
};

type ProcurementImportMapping = Partial<
  Record<keyof ProcurementImportRow, string>
>;

type ExpenseImportMapping = Partial<Record<keyof ExpenseImportRow, string>>;

function normalizeHeader(value: string) {
  return String(value)
    .replace(/^\uFEFF/, "")
    .trim();
}

function normalizeText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  const text = String(value).trim();

  return text === "" ? undefined : text;
}

function normalizeRowKeys(row: Record<string, any>) {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = value;
  }

  return normalized;
}

function getMappedValue(
  row: Record<string, any>,
  fieldName: string,
  mapping?: Partial<Record<string, string>>,
) {
  const normalizedRow = normalizeRowKeys(row);

  const mappedColumn = mapping?.[fieldName];
  const normalizedMappedColumn = mappedColumn
    ? normalizeHeader(mappedColumn)
    : undefined;

  if (
    normalizedMappedColumn &&
    normalizedRow[normalizedMappedColumn] !== undefined
  ) {
    return normalizedRow[normalizedMappedColumn];
  }

  return normalizedRow[fieldName];
}

function parseNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  const normalized = String(value).trim().replace(/\./g, "").replace(/,/g, ".");

  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
}

function parseDate(value?: string | number | Date | null): Date | null {
  if (value === undefined || value === null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const parsed = xlsx.SSF.parse_date_code(value);

    if (!parsed) return null;

    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }

  const text = String(value).trim();

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // Format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // Format DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    const [day, month, year] = text.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

function readRowsFromFile<T>(filePath: string): T[] {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    const fileContent = fs.readFileSync(filePath, "utf8");

    const rows = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, any>[];

    return rows.map((row) => normalizeRowKeys(row)) as T[];
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new AppError("Excel file has no sheet", 400, "EMPTY_FILE");
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
      raw: true,
    });

    return rows.map((row) => normalizeRowKeys(row)) as T[];
  }

  throw new AppError("Unsupported file type", 400, "UNSUPPORTED_FILE_TYPE");
}

function normalizeProcurementRow(
  row: Record<string, any>,
  mapping?: ProcurementImportMapping,
): ProcurementImportRow {
  return {
    purchaseId: normalizeText(
      getMappedValue(row, "purchaseId", mapping as Record<string, string>),
    ),
    purchaseDate: getMappedValue(
      row,
      "purchaseDate",
      mapping as Record<string, string>,
    ),
    vendorName: normalizeText(
      getMappedValue(row, "vendorName", mapping as Record<string, string>),
    ),
    itemDescription: normalizeText(
      getMappedValue(row, "itemDescription", mapping as Record<string, string>),
    ),
    department: normalizeText(
      getMappedValue(row, "department", mapping as Record<string, string>),
    ),
    amountTotal: getMappedValue(
      row,
      "amountTotal",
      mapping as Record<string, string>,
    ),
    procurementMethod: normalizeText(
      getMappedValue(
        row,
        "procurementMethod",
        mapping as Record<string, string>,
      ),
    ),
    employeeExternalRef: normalizeText(
      getMappedValue(
        row,
        "employeeExternalRef",
        mapping as Record<string, string>,
      ),
    ),
  };
}

function normalizeExpenseRow(
  row: Record<string, any>,
  mapping?: ExpenseImportMapping,
): ExpenseImportRow {
  return {
    expenseId: normalizeText(
      getMappedValue(row, "expenseId", mapping as Record<string, string>),
    ),
    expenseDate: getMappedValue(
      row,
      "expenseDate",
      mapping as Record<string, string>,
    ),
    department: normalizeText(
      getMappedValue(row, "department", mapping as Record<string, string>),
    ),
    description: normalizeText(
      getMappedValue(row, "description", mapping as Record<string, string>),
    ),
    employeeExternalRef: normalizeText(
      getMappedValue(
        row,
        "employeeExternalRef",
        mapping as Record<string, string>,
      ),
    ),
    amountTotal: getMappedValue(
      row,
      "amountTotal",
      mapping as Record<string, string>,
    ),
    category: normalizeText(
      getMappedValue(row, "category", mapping as Record<string, string>),
    ),
    merchant: normalizeText(
      getMappedValue(row, "merchant", mapping as Record<string, string>),
    ),
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
