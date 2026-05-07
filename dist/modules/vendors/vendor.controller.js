"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorController = void 0;
const app_error_1 = require("../../core/errors/app-error");
const vendor_schema_1 = require("./vendor.schema");
const vendor_service_1 = require("./vendor.service");
class VendorController {
    static async list(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const result = await vendor_service_1.VendorService.list(req.auth.companyId);
            res.status(200).json({
                success: true,
                message: "Vendors fetched successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async detail(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const result = await vendor_service_1.VendorService.detail(req.auth.companyId, req.params.id);
            res.status(200).json({
                success: true,
                message: "Vendor fetched successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = vendor_schema_1.createVendorSchema.parse(req.body);
            const result = await vendor_service_1.VendorService.create({ userId: req.auth.userId, companyId: req.auth.companyId }, parsed);
            res.status(201).json({
                success: true,
                message: "Vendor created successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = vendor_schema_1.updateVendorSchema.parse(req.body);
            const result = await vendor_service_1.VendorService.update({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id, parsed);
            res.status(200).json({
                success: true,
                message: "Vendor updated successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = vendor_schema_1.updateVendorStatusSchema.parse(req.body);
            const result = await vendor_service_1.VendorService.updateStatus({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id, parsed.status);
            res.status(200).json({
                success: true,
                message: "Vendor status updated successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.VendorController = VendorController;
