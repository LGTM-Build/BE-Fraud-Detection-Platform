import { NextFunction, Request, Response } from "express";
import {
  insertFraudResultSchema,
  insertFraudResultsBatchSchema,
} from "./fraud.schema";
import { FraudIntegrationService } from "./fraud.service";

export class FraudIntegrationController {
  static async insertSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = insertFraudResultSchema.parse(req.body);

      const result = await FraudIntegrationService.insertSingle(parsed);

      return res.status(201).json({
        success: true,
        message: "Fraud result inserted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async insertBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = insertFraudResultsBatchSchema.parse(req.body);

      const result = await FraudIntegrationService.insertBatch(parsed);

      return res.status(201).json({
        success: true,
        message: "Fraud results batch inserted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
