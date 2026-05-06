import { NextFunction, Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const data = await DashboardService.summary(req.auth.companyId);

      return res.status(200).json({
        success: true,
        message: "Dashboard summary fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async highAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const data = await DashboardService.highAlerts(req.auth.companyId);

      return res.status(200).json({
        success: true,
        message: "Dashboard high alerts fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async latestTransactions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const data = await DashboardService.latestTransactions(
        req.auth.companyId,
      );

      return res.status(200).json({
        success: true,
        message: "Dashboard latest transactions fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async fraudTrend(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

      const year = req.query.year ? Number(req.query.year) : undefined;

      const data = await DashboardService.fraudTrend(req.auth.companyId, {
        year,
        period: "monthly",
      });

      return res.status(200).json({
        success: true,
        message: "Dashboard fraud trend fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
