import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import { createEmployeeSchema, updateEmployeeSchema } from "./employee.schema";
import { EmployeeService } from "./employee.service";

export class EmployeeController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const result = await EmployeeService.list(req.auth.companyId);

      res.status(200).json({
        success: true,
        message: "Employees fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async detail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const result = await EmployeeService.detail(
        req.auth.companyId,
        req.params.id as string,
      );

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = createEmployeeSchema.parse(req.body);

      const result = await EmployeeService.create(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        parsed,
      );

      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const parsed = updateEmployeeSchema.parse(req.body);

      const result = await EmployeeService.update(
        { userId: req.auth.userId, companyId: req.auth.companyId },
        req.params.id as string,
        parsed,
      );

      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
