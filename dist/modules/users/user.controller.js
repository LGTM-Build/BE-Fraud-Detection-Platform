"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const app_error_1 = require("../../core/errors/app-error");
const user_schema_1 = require("./user.schema");
const user_service_1 = require("./user.service");
class UserController {
    static async list(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            const result = await user_service_1.UserService.list(req.auth.companyId);
            return res.status(200).json({
                success: true,
                message: "Users fetched successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async detail(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            const result = await user_service_1.UserService.detail(req.auth.companyId, req.params.id);
            return res.status(200).json({
                success: true,
                message: "User fetched successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            const parsed = user_schema_1.createUserSchema.parse(req.body);
            const result = await user_service_1.UserService.create({
                userId: req.auth.userId,
                companyId: req.auth.companyId,
            }, parsed);
            return res.status(201).json({
                success: true,
                message: "User created successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            const parsed = user_schema_1.updateUserSchema.parse(req.body);
            const result = await user_service_1.UserService.update({
                userId: req.auth.userId,
                companyId: req.auth.companyId,
            }, req.params.id, parsed);
            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async toggleActive(req, res, next) {
        try {
            if (!req.auth) {
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            const result = await user_service_1.UserService.toggleActive({
                userId: req.auth.userId,
                companyId: req.auth.companyId,
            }, req.params.id);
            return res.status(200).json({
                success: true,
                message: "User active status updated successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
