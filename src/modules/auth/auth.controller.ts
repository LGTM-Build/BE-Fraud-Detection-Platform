import { NextFunction, Request, Response } from "express";
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerCompanySchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";
import { AppError } from "../../core/errors/app-error";

export class AuthController {
  static async registerCompany(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const parsed = registerCompanySchema.parse(req.body);

      const result = await AuthService.registerCompany({
        ...parsed,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.status(201).json({
        success: true,
        message: "Company registered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);

      const result = await AuthService.login({
        ...parsed,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async profile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }
      const result = await AuthService.profile(
        req.auth.userId,
        req.auth.companyId,
      );

      return res.status(200).json({
        success: true,
        message: "Profile fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = refreshTokenSchema.parse(req.body);

      const result = await AuthService.refreshToken({
        refreshToken: parsed.refreshToken,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = logoutSchema.parse(req.body);

      const result = await AuthService.logout({
        refreshToken: parsed.refreshToken,
      });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
