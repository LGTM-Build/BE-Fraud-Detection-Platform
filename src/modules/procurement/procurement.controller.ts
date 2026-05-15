import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import {
  createProcurementSchema,
  listProcurementMonitorQuerySchema,
  listProcurementTransactionsQuerySchema,
  reviewProcurementSchema,
  updateProcurementSchema,
  updateProcurementStatusSchema,
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

  static async listTransactions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = listProcurementTransactionsQuerySchema.parse(req.query);
      const result = await ProcurementService.listTransactionsForFE(
        req.auth.companyId,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement transactions fetched successfully",
        data: result.items,
        meta: result.meta,
        summary: result.summary,
        cards: result.cards,
        tabs: result.tabs,
        filterCounts: result.filterCounts,
        businessUnits: result.businessUnits,
      });
    } catch (error) {
      next(error);
    }
  }

  static async detailTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const result = await ProcurementService.detailTransactionForFE(
        req.auth.companyId,
        req.params.id as string,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement transaction fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = createProcurementSchema.parse(req.body);
      const created = await ProcurementService.create(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        parsed,
      );

      const result = await ProcurementService.detailTransactionForFE(
        req.auth.companyId,
        created.id,
      );

      return res.status(201).json({
        success: true,
        message: "Procurement transaction created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = updateProcurementSchema.parse(req.body);
      const updated = await ProcurementService.update(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      const result = await ProcurementService.detailTransactionForFE(
        req.auth.companyId,
        updated.id,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement transaction updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTransactionStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = updateProcurementStatusSchema.parse(req.body);
      const result = await ProcurementService.updateTransactionStatusForFE(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Procurement transaction status updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
