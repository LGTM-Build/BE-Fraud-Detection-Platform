import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import { createUserSchema, updateUserSchema } from "./user.schema";
import { UserService } from "./user.service";

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const result = await UserService.list(req.auth.companyId);

      return res.status(200).json({
        success: true,
        message: "Users fetched successfully",
        data: result,
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

      const result = await UserService.detail(
        req.auth.companyId,
        req.params.id as string,
      );

      return res.status(200).json({
        success: true,
        message: "User fetched successfully",
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

      const parsed = createUserSchema.parse(req.body);

      const result = await UserService.create(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        parsed,
      );

      return res.status(201).json({
        success: true,
        message: "User created successfully",
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

      const parsed = updateUserSchema.parse(req.body);

      const result = await UserService.update(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        req.params.id as string,
        parsed,
      );

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }

      const result = await UserService.toggleActive(
        {
          userId: req.auth.userId,
          companyId: req.auth.companyId,
        },
        req.params.id as string,
      );

      return res.status(200).json({
        success: true,
        message: "User active status updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
