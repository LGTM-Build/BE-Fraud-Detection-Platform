import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import { AuditLogService } from "./audit-log.service";
import { listAuditLogQuerySchema } from "./audit-log.schema";

export class AuditLogController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = listAuditLogQuerySchema.parse(req.query);

      const result = await AuditLogService.list(req.auth.companyId, parsed);

      res.status(200).json({
        success: true,
        message: "Audit logs fetched successfully",
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}
