import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import {
  createProcurementSchema,
  listProcurementQuerySchema,
  updateProcurementSchema,
  updateProcurementStatusSchema,
} from "./procurement.schema";
import { ProcurementService } from "./procurement.service";
import { FraudDispatchService } from "../integrations/fraud/fraud-dispatch.service";

export class ProcurementController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const parsedQuery = listProcurementQuerySchema.parse(req.query);

      const result = await ProcurementService.list(req.auth.companyId, {
        status: parsedQuery.status,
        department: parsedQuery.department,
        vendorId: parsedQuery.vendorId,
        minScore: parsedQuery.minScore,
        maxScore: parsedQuery.maxScore,
        page: parsedQuery.page,
        limit: parsedQuery.limit,
      });

      res.status(200).json({
        success: true,
        message: "Procurement transactions fetched successfully",
        data: result.items,
        meta: result.meta,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async detail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const result = await ProcurementService.detail(
        req.auth.companyId,
        req.params.id as string,
      );

      res.status(200).json({
        success: true,
        message: "Procurement transaction fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const parsedBody = createProcurementSchema.parse(req.body);

      const result = await ProcurementService.create(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        parsedBody,
      );

      res.status(201).json({
        success: true,
        message: "Procurement transaction created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const parsedBody = updateProcurementSchema.parse(req.body);

      const result = await ProcurementService.update(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        req.params.id as string,
        parsedBody,
      );

      res.status(200).json({
        success: true,
        message: "Procurement transaction updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const parsedBody = updateProcurementStatusSchema.parse(req.body);

      const result = await ProcurementService.updateStatus(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        req.params.id as string,
        parsedBody,
      );

      res.status(200).json({
        success: true,
        message: "Procurement status updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async dispatchFraud(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const result = await FraudDispatchService.dispatchProcurementForCompany(
        req.auth.companyId,
        req.params.id as string,
        req.auth.userId,
        "manual_dispatch",
        "supervised",
      );

      return res.status(200).json({
        success: true,
        message:
          "Procurement transaction dispatched to fraud service successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
