import { NextFunction, Request, Response } from "express";
import { insertFraudResultsBatchSchema } from "./fraud.schema";
import { FraudIntegrationService } from "./fraud.service";

export class FraudIntegrationController {
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
