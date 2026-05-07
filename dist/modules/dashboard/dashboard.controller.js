"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const app_error_1 = require("../../core/errors/app-error");
const dashboard_service_1 = require("./dashboard.service");
class DashboardController {
    static async summary(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const data = await dashboard_service_1.DashboardService.summary(req.auth.companyId);
            return res.status(200).json({
                success: true,
                message: "Dashboard summary fetched successfully",
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async highAlerts(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const data = await dashboard_service_1.DashboardService.highAlerts(req.auth.companyId);
            return res.status(200).json({
                success: true,
                message: "Dashboard high alerts fetched successfully",
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async latestTransactions(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const data = await dashboard_service_1.DashboardService.latestTransactions(req.auth.companyId);
            return res.status(200).json({
                success: true,
                message: "Dashboard latest transactions fetched successfully",
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async fraudTrend(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const year = req.query.year ? Number(req.query.year) : undefined;
            const data = await dashboard_service_1.DashboardService.fraudTrend(req.auth.companyId, {
                year,
                period: "monthly",
            });
            return res.status(200).json({
                success: true,
                message: "Dashboard fraud trend fetched successfully",
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DashboardController = DashboardController;
