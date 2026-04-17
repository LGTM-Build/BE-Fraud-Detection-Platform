import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import {
  createVendorSchema,
  updateVendorSchema,
  updateVendorStatusSchema,
} from "./vendor.schema";
import { VendorService } from "./vendor.service";

export class VendorController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const result = await VendorService.list(req.auth.companyId);

      res.status(200).json({
        success: true,
        message: "Vendors fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async detail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const result = await VendorService.detail(
        req.auth.companyId,
        req.params.id as string,
      );

      res.status(200).json({
        success: true,
        message: "Vendor fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = createVendorSchema.parse(req.body);

      const result = await VendorService.create(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        parsed,
      );

      res.status(201).json({
        success: true,
        message: "Vendor created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = updateVendorSchema.parse(req.body);

      const result = await VendorService.update(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      res.status(200).json({
        success: true,
        message: "Vendor updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = updateVendorStatusSchema.parse(req.body);

      const result = await VendorService.updateStatus(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed.status,
      );

      res.status(200).json({
        success: true,
        message: "Vendor status updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
