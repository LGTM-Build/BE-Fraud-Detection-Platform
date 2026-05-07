"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_schema_1 = require("./auth.schema");
const auth_service_1 = require("./auth.service");
const app_error_1 = require("../../core/errors/app-error");
class AuthController {
    static async registerCompany(req, res, next) {
        try {
            const parsed = auth_schema_1.registerCompanySchema.parse(req.body);
            const result = await auth_service_1.AuthService.registerCompany({
                ...parsed,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            });
            return res.status(201).json({
                success: true,
                message: "Company registered successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            const parsed = auth_schema_1.loginSchema.parse(req.body);
            const result = await auth_service_1.AuthService.login({
                ...parsed,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            });
            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async profile(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            const result = await auth_service_1.AuthService.profile(req.auth.userId, req.auth.companyId);
            return res.status(200).json({
                success: true,
                message: "Profile fetched successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async refreshToken(req, res, next) {
        try {
            const parsed = auth_schema_1.refreshTokenSchema.parse(req.body);
            const result = await auth_service_1.AuthService.refreshToken({
                refreshToken: parsed.refreshToken,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            });
            return res.status(200).json({
                success: true,
                message: "Token refreshed successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async logout(req, res, next) {
        try {
            const parsed = auth_schema_1.logoutSchema.parse(req.body);
            const result = await auth_service_1.AuthService.logout({
                refreshToken: parsed.refreshToken,
            });
            return res.status(200).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
