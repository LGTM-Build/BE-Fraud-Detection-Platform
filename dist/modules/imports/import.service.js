"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("csv-parse/sync");
const XLSX = __importStar(require("xlsx"));
const prisma_1 = require("../../lib/prisma");
const app_error_1 = require("../../core/errors/app-error");
const fraud_dispatch_service_1 = require("../integrations/fraud/fraud-dispatch.service");
const business_id_1 = require("../../core/utils/business-id");
function parseNumber(value) {
    if (value === undefined || value === null || value === "")
        return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}
function parseDate(value) {
    if (!value)
        return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function readRowsFromFile(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === ".csv") {
        const content = fs_1.default.readFileSync(filePath, "utf-8");
        return (0, sync_1.parse)(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
    }
    if (ext === ".xlsx") {
        const workbook = XLSX.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    }
    throw new app_error_1.AppError("Unsupported file type", 400, "UNSUPPORTED_FILE_TYPE");
}
function getMappedValue(row, fieldName, mapping) {
    const mappedColumn = mapping?.[fieldName];
    if (mappedColumn && row[mappedColumn] !== undefined) {
        return row[mappedColumn];
    }
    return row[fieldName];
}
function normalizeProcurementRow(row, mapping) {
    return {
        purchaseId: getMappedValue(row, "purchaseId", mapping),
        purchaseDate: getMappedValue(row, "purchaseDate", mapping),
        vendorName: getMappedValue(row, "vendorName", mapping),
        itemDescription: getMappedValue(row, "itemDescription", mapping),
        department: getMappedValue(row, "department", mapping),
        amountTotal: getMappedValue(row, "amountTotal", mapping),
        procurementMethod: getMappedValue(row, "procurementMethod", mapping),
        employeeExternalRef: getMappedValue(row, "employeeExternalRef", mapping),
    };
}
function normalizeExpenseRow(row, mapping) {
    return {
        expenseId: getMappedValue(row, "expenseId", mapping),
        expenseDate: getMappedValue(row, "expenseDate", mapping),
        department: getMappedValue(row, "department", mapping),
        description: getMappedValue(row, "description", mapping),
        employeeExternalRef: getMappedValue(row, "employeeExternalRef", mapping),
        amountTotal: getMappedValue(row, "amountTotal", mapping),
        category: getMappedValue(row, "category", mapping),
        merchant: getMappedValue(row, "merchant", mapping),
    };
}
function normalizeProcurementMethod(value) {
    const method = (value || "").trim().toLowerCase();
    if (method === "pengadaan_langsung")
        return "pengadaan_langsung";
    if (method === "tender_terbuka")
        return "tender_terbuka";
    if (method === "tender_tertutup")
        return "tender_tertutup";
    if (method === "e_purchasing")
        return "e_purchasing";
    if (method === "rfp")
        return "rfp";
    return "lainnya";
}
function normalizeExpenseCategory(value) {
    const category = (value || "").trim().toLowerCase();
    if (category === "entertainment")
        return "entertainment";
    if (category === "transport")
        return "transport";
    if (category === "office_supply")
        return "office_supply";
    if (category === "meals")
        return "meals";
    if (category === "vehicle")
        return "vehicle";
    if (category === "training")
        return "training";
    return "others";
}
class ImportService {
    static async importProcurements(actor, filePath, dispatchMl = false, mapping) {
        const rawRows = readRowsFromFile(filePath);
        const rows = rawRows.map((row) => normalizeProcurementRow(row, mapping));
        const createdIds = [];
        if (!rows.length) {
            throw new app_error_1.AppError("File is empty", 400, "EMPTY_FILE");
        }
        const successes = [];
        const errors = [];
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const rowNumber = index + 2;
            try {
                if (!row.purchaseDate) {
                    throw new app_error_1.AppError("purchaseDate is required", 400, "VALIDATION_ERROR");
                }
                if (!row.vendorName) {
                    throw new app_error_1.AppError("vendorName is required", 400, "VALIDATION_ERROR");
                }
                if (!row.itemDescription) {
                    throw new app_error_1.AppError("itemDescription is required", 400, "VALIDATION_ERROR");
                }
                const amountTotal = parseNumber(row.amountTotal);
                if (amountTotal === null) {
                    throw new app_error_1.AppError("amountTotal is invalid", 400, "VALIDATION_ERROR");
                }
                const purchaseDate = parseDate(row.purchaseDate);
                if (!purchaseDate) {
                    throw new app_error_1.AppError("purchaseDate is invalid", 400, "VALIDATION_ERROR");
                }
                let employeeId = null;
                if (row.employeeExternalRef) {
                    const employee = await prisma_1.prisma.employee.findFirst({
                        where: {
                            companyId: actor.companyId,
                            externalRef: row.employeeExternalRef,
                        },
                    });
                    if (!employee) {
                        throw new app_error_1.AppError(`Employee with externalRef '${row.employeeExternalRef}' not found`, 404, "EMPLOYEE_NOT_FOUND");
                    }
                    employeeId = employee.id;
                }
                const purchaseId = row.purchaseId || (await (0, business_id_1.generatePurchaseId)(actor.companyId));
                const created = await prisma_1.prisma.procurementTransaction.create({
                    data: {
                        companyId: actor.companyId,
                        employeeId,
                        purchaseId,
                        purchaseDate,
                        vendorName: row.vendorName,
                        itemDescription: row.itemDescription,
                        department: row.department || null,
                        amountTotal,
                        procurementMethod: normalizeProcurementMethod(row.procurementMethod),
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
            }
            catch (error) {
                errors.push({
                    rowNumber,
                    purchaseId: row.purchaseId || undefined,
                    message: error.message || "Unknown import error",
                });
            }
        }
        let aiDispatch = null;
        if (dispatchMl && createdIds.length > 0) {
            try {
                aiDispatch = await fraud_dispatch_service_1.FraudDispatchService.dispatchProcurements(actor, createdIds, "import");
            }
            catch (error) {
                aiDispatch = {
                    success: false,
                    message: error.message ?? "Failed to dispatch procurements to AI",
                };
            }
        }
        return {
            filename: path_1.default.basename(filePath),
            totalRows: rows.length,
            successRows: successes.length,
            failedRows: errors.length,
            successes,
            errors,
            aiDispatch,
        };
    }
    static async importExpenses(actor, filePath, dispatchMl = false, mapping) {
        const rawRows = readRowsFromFile(filePath);
        const rows = rawRows.map((row) => normalizeExpenseRow(row, mapping));
        const createdIds = [];
        if (!rows.length) {
            throw new app_error_1.AppError("File is empty", 400, "EMPTY_FILE");
        }
        const successes = [];
        const errors = [];
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const rowNumber = index + 2;
            try {
                if (!row.expenseDate) {
                    throw new app_error_1.AppError("expenseDate is required", 400, "VALIDATION_ERROR");
                }
                if (!row.description) {
                    throw new app_error_1.AppError("description is required", 400, "VALIDATION_ERROR");
                }
                if (!row.employeeExternalRef) {
                    throw new app_error_1.AppError("employeeExternalRef is required", 400, "VALIDATION_ERROR");
                }
                const amountTotal = parseNumber(row.amountTotal);
                if (amountTotal === null) {
                    throw new app_error_1.AppError("amountTotal is invalid", 400, "VALIDATION_ERROR");
                }
                const expenseDate = parseDate(row.expenseDate);
                if (!expenseDate) {
                    throw new app_error_1.AppError("expenseDate is invalid", 400, "VALIDATION_ERROR");
                }
                const employee = await prisma_1.prisma.employee.findFirst({
                    where: {
                        companyId: actor.companyId,
                        externalRef: row.employeeExternalRef,
                    },
                });
                if (!employee) {
                    throw new app_error_1.AppError(`Employee with externalRef '${row.employeeExternalRef}' not found`, 404, "EMPLOYEE_NOT_FOUND");
                }
                const expenseId = row.expenseId || (await (0, business_id_1.generateExpenseId)(actor.companyId));
                const created = await prisma_1.prisma.expense.create({
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
            }
            catch (error) {
                errors.push({
                    rowNumber,
                    expenseId: row.expenseId || undefined,
                    message: error.message || "Unknown import error",
                });
            }
        }
        let aiDispatch = null;
        if (dispatchMl && createdIds.length > 0) {
            try {
                aiDispatch = await fraud_dispatch_service_1.FraudDispatchService.dispatchExpenses(actor, createdIds, "import");
            }
            catch (error) {
                aiDispatch = {
                    success: false,
                    message: error.message ?? "Failed to dispatch expenses to AI",
                };
            }
        }
        return {
            filename: path_1.default.basename(filePath),
            totalRows: rows.length,
            successRows: successes.length,
            failedRows: errors.length,
            successes,
            errors,
            aiDispatch,
        };
    }
}
exports.ImportService = ImportService;
