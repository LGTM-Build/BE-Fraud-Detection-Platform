"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const prisma_1 = require("../../lib/prisma");
const app_error_1 = require("../../core/errors/app-error");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
class VendorService {
    static async list(companyId) {
        return prisma_1.prisma.vendor.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" },
        });
    }
    static async detail(companyId, id) {
        const vendor = await prisma_1.prisma.vendor.findFirst({
            where: { id, companyId },
        });
        if (!vendor) {
            throw new app_error_1.AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
        }
        return vendor;
    }
    static async create(actor, input) {
        const existing = await prisma_1.prisma.vendor.findFirst({
            where: {
                companyId: actor.companyId,
                vendorName: input.vendorName,
            },
        });
        if (existing) {
            throw new app_error_1.AppError("Vendor already exists", 409, "VENDOR_ALREADY_EXISTS");
        }
        const vendor = await prisma_1.prisma.vendor.create({
            data: {
                companyId: actor.companyId,
                vendorName: input.vendorName,
                metadata: input.metadata,
                status: input.status ?? "active",
            },
        });
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "create_vendor",
            targetType: "vendor",
            targetId: vendor.id,
            note: "Created vendor",
            metadata: {
                vendorName: vendor.vendorName,
                status: vendor.status,
            },
        });
        return vendor;
    }
    static async update(actor, id, input) {
        const existing = await prisma_1.prisma.vendor.findFirst({
            where: { id, companyId: actor.companyId },
        });
        if (!existing) {
            throw new app_error_1.AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
        }
        if (input.vendorName && input.vendorName !== existing.vendorName) {
            const duplicate = await prisma_1.prisma.vendor.findFirst({
                where: {
                    companyId: actor.companyId,
                    vendorName: input.vendorName,
                    NOT: {
                        id: existing.id,
                    },
                },
            });
            if (duplicate) {
                throw new app_error_1.AppError("Vendor already exists", 409, "VENDOR_ALREADY_EXISTS");
            }
        }
        const updated = await prisma_1.prisma.vendor.update({
            where: { id: existing.id },
            data: {
                vendorName: input.vendorName ?? existing.vendorName,
                metadata: input.metadata === undefined
                    ? existing.metadata
                    : input.metadata,
                status: input.status ?? existing.status,
            },
        });
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "update_vendor",
            targetType: "vendor",
            targetId: updated.id,
            note: "Updated vendor",
            metadata: {
                before: {
                    vendorName: existing.vendorName,
                    status: existing.status,
                },
                after: {
                    vendorName: updated.vendorName,
                    status: updated.status,
                },
            },
        });
        return updated;
    }
    static async updateStatus(actor, id, status) {
        const existing = await prisma_1.prisma.vendor.findFirst({
            where: { id, companyId: actor.companyId },
        });
        if (!existing) {
            throw new app_error_1.AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
        }
        const updated = await prisma_1.prisma.vendor.update({
            where: { id: existing.id },
            data: { status },
        });
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "update_vendor_status",
            targetType: "vendor",
            targetId: updated.id,
            note: `Vendor status changed from ${existing.status} to ${updated.status}`,
            metadata: {
                previousStatus: existing.status,
                currentStatus: updated.status,
            },
        });
        return updated;
    }
}
exports.VendorService = VendorService;
