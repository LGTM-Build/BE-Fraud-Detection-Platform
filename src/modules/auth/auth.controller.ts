import { NextFunction, Request, Response } from "express";
import { registerCompanySchema, loginSchema } from "./auth.schema";
import { AuthService } from "./auth.service";

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
}
