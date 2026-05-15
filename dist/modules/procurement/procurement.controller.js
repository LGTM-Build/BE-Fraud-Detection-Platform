"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementController = void 0;
const app_error_1 = require("../../core/errors/app-error");
const procurement_schema_1 = require("./procurement.schema");
const procurement_service_1 = require("./procurement.service");
class ProcurementController {
    static async listMonitor(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = procurement_schema_1.listProcurementMonitorQuerySchema.parse(req.query);
            const result = await procurement_service_1.ProcurementService.listMonitor(req.auth.companyId, parsed);
            return res.status(200).json({
                success: true,
                message: "Procurement monitor fetched successfully",
                data: result.items,
                meta: result.meta,
                summary: result.summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async detailMonitor(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const result = await procurement_service_1.ProcurementService.detailMonitor(req.auth.companyId, req.params.id);
            return res.status(200).json({
                success: true,
                message: "Procurement detail fetched successfully",
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
            const parsed = procurement_schema_1.createProcurementSchema.parse(req.body);
            const result = await procurement_service_1.ProcurementService.create({ userId: req.auth.userId, companyId: req.auth.companyId }, parsed);
            return res.status(201).json({
                success: true,
                message: "Procurement created successfully",
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
            const parsed = procurement_schema_1.updateProcurementSchema.parse(req.body);
            const result = await procurement_service_1.ProcurementService.update({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id, parsed);
            return res.status(200).json({
                success: true,
                message: "Procurement updated successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async review(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = procurement_schema_1.reviewProcurementSchema.parse(req.body);
            const result = await procurement_service_1.ProcurementService.review({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id, parsed);
            return res.status(200).json({
                success: true,
                message: "Procurement reviewed successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async dispatchMl(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const result = await procurement_service_1.ProcurementService.dispatchMl({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id);
            return res.status(200).json({
                success: true,
                message: "Procurement dispatched to ML successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async listTransactions(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = procurement_schema_1.listProcurementTransactionsQuerySchema.parse(req.query);
            const result = await procurement_service_1.ProcurementService.listTransactionsForFE(req.auth.companyId, parsed);
            return res.status(200).json({
                success: true,
                message: "Procurement transactions fetched successfully",
                data: result.items,
                meta: result.meta,
                summary: result.summary,
                cards: result.cards,
                tabs: result.tabs,
                filterCounts: result.filterCounts,
                businessUnits: result.businessUnits,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async detailTransaction(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const result = await procurement_service_1.ProcurementService.detailTransactionForFE(req.auth.companyId, req.params.id);
            return res.status(200).json({
                success: true,
                message: "Procurement transaction fetched successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createTransaction(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = procurement_schema_1.createProcurementSchema.parse(req.body);
            const created = await procurement_service_1.ProcurementService.create({ userId: req.auth.userId, companyId: req.auth.companyId }, parsed);
            const result = await procurement_service_1.ProcurementService.detailTransactionForFE(req.auth.companyId, created.id);
            return res.status(201).json({
                success: true,
                message: "Procurement transaction created successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateTransaction(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = procurement_schema_1.updateProcurementSchema.parse(req.body);
            const updated = await procurement_service_1.ProcurementService.update({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id, parsed);
            const result = await procurement_service_1.ProcurementService.detailTransactionForFE(req.auth.companyId, updated.id);
            return res.status(200).json({
                success: true,
                message: "Procurement transaction updated successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateTransactionStatus(req, res, next) {
        try {
            if (!req.auth)
                throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
            const parsed = procurement_schema_1.updateProcurementStatusSchema.parse(req.body);
            const result = await procurement_service_1.ProcurementService.updateTransactionStatusForFE({ userId: req.auth.userId, companyId: req.auth.companyId }, req.params.id, parsed);
            return res.status(200).json({
                success: true,
                message: "Procurement transaction status updated successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProcurementController = ProcurementController;
