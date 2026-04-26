import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import { ImportService } from "./import.service";
import { importProcurementQuerySchema } from "./import.schema";

export class ImportController {
  static async importProcurement(
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

      const parsedQuery = importProcurementQuerySchema.parse(req.query);

      const result = await ImportService.importProcurementFile(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        req.file.path,
        parsedQuery.dispatchFraud,
      );

      return res.status(201).json({
        success: true,
        message: "Procurement file imported successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
