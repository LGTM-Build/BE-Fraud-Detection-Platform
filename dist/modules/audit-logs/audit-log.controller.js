"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const app_error_1 = require("../../core/errors/app-error");
const audit_log_service_1 = require("./audit-log.service");
const audit_log_schema_1 = require("./audit-log.schema");
class AuditLogController {
    static async list(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = audit_log_schema_1.listAuditLogQuerySchema.parse(req.query);
            const result = await audit_log_service_1.AuditLogService.list(req.auth.companyId, parsed);
            res.status(200).json({
                success: true,
                message: "Audit logs fetched successfully",
                data: result.items,
                meta: result.meta,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuditLogController = AuditLogController;
