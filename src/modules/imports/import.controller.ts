import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import { ImportService } from "./import.service";
import { importQuerySchema } from "./import.schema";

export class ImportController {
  static async importProcurements(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      if (!req.file) {
        throw new AppError("File is required", 400, "FILE_REQUIRED");
      }

      const parsed = importQuerySchema.parse(req.query);

      const mapping = req.body.mapping
        ? JSON.parse(req.body.mapping)
        : undefined;

      const result = await ImportService.importProcurements(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        req.file.path,
        parsed.dispatchMl,
        mapping,
      );

      return res.status(201).json({
        success: true,
        message: "Procurements imported successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async importExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      if (!req.file) {
        throw new AppError("File is required", 400, "FILE_REQUIRED");
      }

      const mapping = req.body.mapping
        ? JSON.parse(req.body.mapping)
        : undefined;

      const dispatchMl = req.query.dispatchMl === "true";

      const result = await ImportService.importExpenses(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        req.file.path,
        dispatchMl,
        mapping,
      );

      return res.status(201).json({
        success: true,
        message: "Expenses imported successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
