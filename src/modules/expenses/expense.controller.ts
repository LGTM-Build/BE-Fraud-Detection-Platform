import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import {
  createExpenseSchema,
  listExpenseMonitorQuerySchema,
  listExpenseTransactionsQuerySchema,
  reviewExpenseSchema,
  updateExpenseStatusSchema,
} from "./expense.schema";
import { ExpenseService } from "./expense.service";

export class ExpenseController {
  static async listMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = listExpenseMonitorQuerySchema.parse(req.query);
      const result = await ExpenseService.listMonitor(
        req.auth.companyId,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Expense monitor fetched successfully",
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

      const result = await ExpenseService.detailMonitor(
        req.auth.companyId,
        req.params.id as string,
      );

      return res.status(200).json({
        success: true,
        message: "Expense detail fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = createExpenseSchema.parse(req.body);
      const result = await ExpenseService.create(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        parsed,
      );

      return res.status(201).json({
        success: true,
        message: "Expense created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async review(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = reviewExpenseSchema.parse(req.body);
      const result = await ExpenseService.review(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Expense reviewed successfully",
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

      const parsed = listExpenseTransactionsQuerySchema.parse(req.query);
      const result = await ExpenseService.listTransactionsForFE(
        req.auth.companyId,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Expense transactions fetched successfully",
        data: result.items,
        meta: result.meta,
        summary: result.summary,
        cards: result.cards,
        tabs: result.tabs,
        filterCounts: result.filterCounts,
        departments: result.departments,
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

      const result = await ExpenseService.detailTransactionForFE(
        req.auth.companyId,
        req.params.id as string,
      );

      return res.status(200).json({
        success: true,
        message: "Expense transaction fetched successfully",
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

      const parsed = updateExpenseStatusSchema.parse(req.body);
      const result = await ExpenseService.updateTransactionStatusForFE(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "Expense transaction status updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
