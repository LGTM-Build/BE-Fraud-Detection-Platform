"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const app_error_1 = require("../../core/errors/app-error");
const expense_schema_1 = require("./expense.schema");
const expense_service_1 = require("./expense.service");
class ExpenseController {
    static async listMonitor(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = expense_schema_1.listExpenseMonitorQuerySchema.parse(req.query);
            const result = await expense_service_1.ExpenseService.listMonitor(req.auth.companyId, parsed);
            return res.status(200).json({
                success: true,
                message: "Expense monitor fetched successfully",
                data: result.items,
                meta: result.meta,
                summary: result.summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async detailMonitor(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const result = await expense_service_1.ExpenseService.detailMonitor(req.auth.companyId, req.params.id);
            return res.status(200).json({
                success: true,
                message: "Expense detail fetched successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = expense_schema_1.createExpenseSchema.parse(req.body);
            const result = await expense_service_1.ExpenseService.create({ userId: req.auth.userId, companyId: req.auth.companyId }, parsed);
            return res.status(201).json({
                success: true,
                message: "Expense created successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async review(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = expense_schema_1.reviewExpenseSchema.parse(req.body);
            const result = await expense_service_1.ExpenseService.review({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id, parsed);
            return res.status(200).json({
                success: true,
                message: "Expense reviewed successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ExpenseController = ExpenseController;
