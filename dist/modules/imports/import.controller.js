"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportController = void 0;
const app_error_1 = require("../../core/errors/app-error");
const import_service_1 = require("./import.service");
const import_schema_1 = require("./import.schema");
class ImportController {
    static async importProcurements(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            if (!req.file) {
                throw new app_error_1.AppError("File is required", 400, "FILE_REQUIRED");
            }
            const parsed = import_schema_1.importQuerySchema.parse(req.query);
            const mapping = req.body.mapping
                ? JSON.parse(req.body.mapping)
                : undefined;
            const result = await import_service_1.ImportService.importProcurements({
                userId: req.auth.userId,
                companyId: req.auth.companyId,
            }, req.file.path, parsed.dispatchMl, mapping);
            return res.status(201).json({
                success: true,
                message: "Procurements imported successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async importExpenses(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            if (!req.file) {
                throw new app_error_1.AppError("File is required", 400, "FILE_REQUIRED");
            }
            const mapping = req.body.mapping
                ? JSON.parse(req.body.mapping)
                : undefined;
            const dispatchMl = req.query.dispatchMl === "true";
            const result = await import_service_1.ImportService.importExpenses({
                userId: req.auth.userId,
                companyId: req.auth.companyId,
            }, req.file.path, dispatchMl, mapping);
            return res.status(201).json({
                success: true,
                message: "Expenses imported successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ImportController = ImportController;
