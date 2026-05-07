"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpenseMonitorQuerySchema = exports.reviewExpenseSchema = exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
const reviewStatusEnum = zod_1.z.enum([
    "pending",
    "alert",
    "high_alert",
    "auto_approved",
    "approved",
    "rejected",
]);
const expenseCategoryEnum = zod_1.z.enum([
    "entertainment",
    "transport",
    "office_supply",
    "meals",
    "vehicle",
    "training",
    "others",
]);
exports.createExpenseSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid(),
    expenseId: zod_1.z.string().max(100).optional().nullable(),
    expenseDate: zod_1.z.string().datetime(),
    description: zod_1.z.string().min(1),
    category: expenseCategoryEnum,
    merchant: zod_1.z.string().max(255).optional().nullable(),
    amountTotal: zod_1.z.number().nonnegative(),
    department: zod_1.z.string().max(100).optional().nullable(),
});
exports.updateExpenseSchema = exports.createExpenseSchema.partial();
exports.reviewExpenseSchema = zod_1.z.object({
    status: zod_1.z.enum(["approved", "rejected"]),
});
exports.listExpenseMonitorQuerySchema = zod_1.z.object({
    status: reviewStatusEnum.optional(),
    group: zod_1.z.enum(["ml_pending", "needs_review", "reviewed"]).optional(),
    department: zod_1.z.string().optional(),
    searchEmployee: zod_1.z.string().optional(),
    searchDescription: zod_1.z.string().optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
