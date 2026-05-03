import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import {
  createProcurementSchema,
  listProcurementMonitorQuerySchema,
  reviewProcurementSchema,
  updateProcurementSchema,
} from "./procurement.schema";
import { ProcurementService } from "./procurement.service";

export class ProcurementController {
  static async listMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = listProcurementMonitorQuerySchema.parse(req.query);
      const result = await ProcurementService.listMonitor(
        req.auth.companyId,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement monitor fetched successfully",
        data: result.items,
        meta: result.meta,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async detailMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const result = await ProcurementService.detailMonitor(
        req.auth.companyId,
        req.params.id as string,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement detail fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = createProcurementSchema.parse(req.body);
      const result = await ProcurementService.create(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        parsed,
      );

      return res.status(201).json({
        success: true,
        message: "Procurement created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = updateProcurementSchema.parse(req.body);
      const result = await ProcurementService.update(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async review(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = reviewProcurementSchema.parse(req.body);
      const result = await ProcurementService.review(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement reviewed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async dispatchMl(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const result = await ProcurementService.dispatchMl(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement dispatched to ML successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
