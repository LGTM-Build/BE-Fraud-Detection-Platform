"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementService = void 0;
const prisma_1 = require("../../lib/prisma");
const app_error_1 = require("../../core/errors/app-error");
const monitor_status_1 = require("../../core/utils/monitor-status");
const fraud_dispatch_service_1 = require("../integrations/fraud/fraud-dispatch.service");
const vendor_service_1 = require("../vendors/vendor.service");
function normalizeFlags(flags) {
    if (!flags)
        return [];
    if (Array.isArray(flags))
        return flags.filter(Boolean).map(String);
    if (typeof flags === "object") {
        return Object.entries(flags)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => key);
    }
    return [];
}
function decimalToNumber(value) {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === "object" && "toNumber" in value) {
        return value.toNumber();
    }
    return Number(value);
}
function mergeFlags(...collections) {
    const merged = new Set();
    for (const collection of collections) {
        if (!collection)
            continue;
        for (const item of collection) {
            if (!item)
                continue;
            merged.add(String(item));
        }
    }
    return [...merged];
}
function statusSeverity(status) {
    const map = {
        pending: 1,
        alert: 2,
        high_alert: 3,
        auto_approved: 4,
        approved: 4,
        rejected: 4,
    };
    return map[status];
}
function maxStatus(left, right) {
    return statusSeverity(left) >= statusSeverity(right) ? left : right;
}
function procurementMethodLabel(method) {
    const map = {
        pengadaan_langsung: "Pengadaan Langsung",
        tender_terbuka: "Tender Terbuka",
        tender_tertutup: "Tender Tertutup",
        e_purchasing: "E-Purchasing",
        rfp: "RFP",
        lainnya: "Lainnya",
    };
    return map[method];
}
function isReviewedStatus(status) {
    return (status === "approved" ||
        status === "rejected" ||
        status === "auto_approved");
}
function reviewerLabel(status, reviewerName) {
    if (status === "auto_approved") {
        return "Sistem AI";
    }
    if (status === "approved" || status === "rejected") {
        return reviewerName?.trim() || "Sudah direview";
    }
    return null;
}
function statusToFrontendLabel(status) {
    const map = {
        pending: "Menunggu AI",
        alert: "Perlu Ditinjau",
        high_alert: "Risiko Tinggi",
        auto_approved: "Disetujui Otomatis",
        approved: "Disetujui",
        rejected: "Ditolak",
    };
    return map[status];
}
function statusToFrontendKey(status) {
    const map = {
        pending: "waiting_ai",
        alert: "needs_review",
        high_alert: "high_risk",
        auto_approved: "auto_approved",
        approved: "approved",
        rejected: "rejected",
    };
    return map[status];
}
function formatDate(date) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}
function getVendorProcurementRisk(status) {
    if (status === "blacklisted") {
        return {
            flags: ["Blacklisted Vendor"],
            status: "high_alert",
            fraudScore: 90,
        };
    }
    if (status === "inactive") {
        return {
            flags: ["Vendor Inactive"],
            status: "alert",
            fraudScore: null,
        };
    }
    return {
        flags: [],
        status: "pending",
        fraudScore: null,
    };
}
function serializeProcurement(item) {
    const amount = decimalToNumber(item.amountTotal);
    const reviewer = reviewerLabel(item.status, item.updatedByUser?.fullName);
    const employeeName = item.employee?.fullName ?? null;
    const requesterName = item.createdByUser.fullName;
    const businessUnit = item.department ?? item.employee?.department ?? null;
    const shortId = item.id.slice(0, 8);
    const statusLabel = statusToFrontendLabel(item.status);
    const statusKey = statusToFrontendKey(item.status);
    return {
        id: item.id,
        purchaseId: item.purchaseId,
        purchaseDate: item.purchaseDate.toISOString(),
        purchaseDateLabel: formatDate(item.purchaseDate),
        vendorName: item.vendorName,
        itemDescription: item.itemDescription,
        department: businessUnit,
        businessUnit,
        requester: employeeName ?? requesterName,
        employeeId: item.employee?.id ?? item.employeeId ?? null,
        employeeName,
        requesterId: item.createdByUser.id,
        requesterName,
        createdByName: requesterName,
        inputBy: requesterName,
        reviewerName: reviewer,
        reviewedBy: reviewer,
        approver: reviewer,
        amount,
        amountTotal: amount,
        fraudScore: item.fraudScore ?? 0,
        flags: normalizeFlags(item.flags),
        status: item.status,
        statusKey,
        statusLabel,
        procurementMethod: item.procurementMethod,
        procurementMethodLabel: procurementMethodLabel(item.procurementMethod),
        aiExplanation: item.aiExplanation ?? "Belum ada analisis AI.",
        itemEmployeeLabel: `${item.itemDescription} - ${employeeName ?? "-"}`,
        displayId: item.purchaseId ?? shortId,
        shortId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
class ProcurementService {
    static async create(actor, input) {
        if (input.employeeId) {
            const employee = await prisma_1.prisma.employee.findFirst({
                where: {
                    id: input.employeeId,
                    companyId: actor.companyId,
                },
            });
            if (!employee) {
                throw new app_error_1.AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
            }
        }
        const vendorResult = await vendor_service_1.VendorService.ensureVendor(actor, {
            vendorName: input.vendorName,
            metadata: {
                source: "procurement_manual",
            },
        });
        if (vendorResult.vendor.status === "inactive") {
            throw new app_error_1.AppError("Vendor is inactive and cannot be used for manual procurement", 409, "VENDOR_INACTIVE");
        }
        if (vendorResult.vendor.status === "blacklisted") {
            throw new app_error_1.AppError("Vendor is blacklisted and cannot be used for manual procurement", 409, "VENDOR_BLACKLISTED");
        }
        return prisma_1.prisma.procurementTransaction.create({
            data: {
                companyId: actor.companyId,
                employeeId: input.employeeId ?? null,
                purchaseId: input.purchaseId ?? null,
                purchaseDate: new Date(input.purchaseDate),
                vendorName: input.vendorName,
                itemDescription: input.itemDescription,
                department: input.department ?? null,
                amountTotal: input.amountTotal,
                procurementMethod: input.procurementMethod ?? "lainnya",
                createdBy: actor.userId,
                updatedBy: actor.userId,
            },
            include: {
                employee: true,
            },
        });
    }
    static async update(actor, id, input) {
        const existing = await prisma_1.prisma.procurementTransaction.findFirst({
            where: {
                companyId: actor.companyId,
                OR: [{ id }, { purchaseId: id }],
            },
        });
        if (!existing) {
            throw new app_error_1.AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
        }
        if (input.employeeId) {
            const employee = await prisma_1.prisma.employee.findFirst({
                where: {
                    id: input.employeeId,
                    companyId: actor.companyId,
                },
            });
            if (!employee) {
                throw new app_error_1.AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
            }
        }
        if (input.vendorName) {
            const vendorResult = await vendor_service_1.VendorService.ensureVendor(actor, {
                vendorName: input.vendorName,
                metadata: {
                    source: "procurement_manual",
                },
            });
            if (vendorResult.vendor.status === "inactive") {
                throw new app_error_1.AppError("Vendor is inactive and cannot be used for manual procurement", 409, "VENDOR_INACTIVE");
            }
            if (vendorResult.vendor.status === "blacklisted") {
                throw new app_error_1.AppError("Vendor is blacklisted and cannot be used for manual procurement", 409, "VENDOR_BLACKLISTED");
            }
        }
        return prisma_1.prisma.procurementTransaction.update({
            where: { id: existing.id },
            data: {
                employeeId: input.employeeId === undefined
                    ? existing.employeeId
                    : input.employeeId,
                purchaseId: input.purchaseId === undefined
                    ? existing.purchaseId
                    : input.purchaseId,
                purchaseDate: input.purchaseDate
                    ? new Date(input.purchaseDate)
                    : existing.purchaseDate,
                vendorName: input.vendorName ?? existing.vendorName,
                itemDescription: input.itemDescription ?? existing.itemDescription,
                department: input.department === undefined
                    ? existing.department
                    : input.department,
                amountTotal: input.amountTotal ?? existing.amountTotal,
                procurementMethod: input.procurementMethod === undefined
                    ? existing.procurementMethod
                    : input.procurementMethod,
                updatedBy: actor.userId,
            },
            include: {
                employee: true,
            },
        });
    }
    static async listMonitor(companyId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const groupedStatuses = (0, monitor_status_1.groupToStatuses)(query.group);
        const where = {
            companyId,
            ...(query.status ? { status: query.status } : {}),
            ...(groupedStatuses
                ? { status: { in: groupedStatuses } }
                : {}),
            ...(query.department ? { department: query.department } : {}),
            ...(query.searchVendor
                ? { vendorName: { contains: query.searchVendor } }
                : {}),
            ...(query.searchItem
                ? { itemDescription: { contains: query.searchItem } }
                : {}),
            ...(query.dateFrom || query.dateTo
                ? {
                    purchaseDate: {
                        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
                    },
                }
                : {}),
        };
        const [items, total, grouped] = await Promise.all([
            prisma_1.prisma.procurementTransaction.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            fullName: true,
                            department: true,
                            position: true,
                            externalRef: true,
                        },
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true,
                        },
                    },
                    updatedByUser: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { purchaseDate: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.procurementTransaction.count({ where }),
            prisma_1.prisma.procurementTransaction.groupBy({
                by: ["status"],
                where,
                _count: { status: true },
            }),
        ]);
        return {
            items: items.map((item) => ({
                id: item.id,
                purchaseId: item.purchaseId,
                purchaseDate: item.purchaseDate,
                employeeId: item.employeeId,
                employeeName: item.employee?.fullName ?? null,
                employee: item.employee
                    ? {
                        id: item.employee.id,
                        fullName: item.employee.fullName,
                        department: item.employee.department,
                        position: item.employee.position,
                        externalRef: item.employee.externalRef,
                    }
                    : null,
                createdBy: item.createdBy,
                createdByName: item.createdByUser.fullName,
                createdByUser: {
                    id: item.createdByUser.id,
                    fullName: item.createdByUser.fullName,
                    email: item.createdByUser.email,
                    role: item.createdByUser.role,
                },
                updatedBy: item.updatedBy,
                updatedByName: item.updatedByUser?.fullName ?? null,
                updatedByUser: item.updatedByUser
                    ? {
                        id: item.updatedByUser.id,
                        fullName: item.updatedByUser.fullName,
                        email: item.updatedByUser.email,
                        role: item.updatedByUser.role,
                    }
                    : null,
                vendorName: item.vendorName,
                itemDescription: item.itemDescription,
                department: item.department,
                amountTotal: item.amountTotal,
                procurementMethod: item.procurementMethod,
                procurementMethodLabel: procurementMethodLabel(item.procurementMethod),
                fraudScore: item.fraudScore,
                aiExplanation: item.aiExplanation,
                flags: normalizeFlags(item.flags),
                status: item.status,
                statusLabel: (0, monitor_status_1.statusLabel)(item.status),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            summary: {
                all: grouped.reduce((acc, item) => acc + item._count.status, 0),
                highAlert: grouped.find((x) => x.status === "high_alert")?._count.status ?? 0,
                alert: grouped.find((x) => x.status === "alert")?._count.status ?? 0,
                autoApproved: grouped.find((x) => x.status === "auto_approved")?._count.status ?? 0,
                approved: grouped.find((x) => x.status === "approved")?._count.status ?? 0,
                rejected: grouped.find((x) => x.status === "rejected")?._count.status ?? 0,
                pending: grouped.find((x) => x.status === "pending")?._count.status ?? 0,
            },
        };
    }
    static async detailMonitor(companyId, id) {
        const item = await prisma_1.prisma.procurementTransaction.findFirst({
            where: {
                companyId,
                OR: [{ id }, { purchaseId: id }],
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        department: true,
                        position: true,
                        externalRef: true,
                    },
                },
                createdByUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
                updatedByUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!item) {
            throw new app_error_1.AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
        }
        return {
            id: item.id,
            purchaseId: item.purchaseId,
            purchaseDate: item.purchaseDate,
            fraudScore: item.fraudScore,
            aiExplanation: item.aiExplanation,
            flags: normalizeFlags(item.flags),
            employeeId: item.employeeId,
            employeeName: item.employee?.fullName ?? null,
            employee: item.employee,
            createdBy: item.createdBy,
            createdByName: item.createdByUser.fullName,
            createdByUser: item.createdByUser,
            updatedBy: item.updatedBy,
            updatedByName: item.updatedByUser?.fullName ?? null,
            updatedByUser: item.updatedByUser,
            detail: {
                vendorName: item.vendorName,
                itemDescription: item.itemDescription,
                department: item.department,
                requester: item.employee?.fullName ?? item.createdByUser.fullName,
                requesterId: item.createdByUser.id,
                requesterName: item.createdByUser.fullName,
                inputBy: item.createdByUser.fullName,
                reviewerName: reviewerLabel(item.status, item.updatedByUser?.fullName),
                reviewedBy: reviewerLabel(item.status, item.updatedByUser?.fullName),
                approver: reviewerLabel(item.status, item.updatedByUser?.fullName),
                procurementMethod: item.procurementMethod,
                procurementMethodLabel: procurementMethodLabel(item.procurementMethod),
                amountTotal: item.amountTotal,
                status: item.status,
                statusLabel: (0, monitor_status_1.statusLabel)(item.status),
            },
        };
    }
    static async review(actor, id, input) {
        const existing = await prisma_1.prisma.procurementTransaction.findFirst({
            where: {
                companyId: actor.companyId,
                OR: [{ id }, { purchaseId: id }],
            },
        });
        if (!existing) {
            throw new app_error_1.AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
        }
        if (isReviewedStatus(existing.status)) {
            throw new app_error_1.AppError("Procurement transaction has already been reviewed", 409, "PROCUREMENT_ALREADY_REVIEWED");
        }
        return prisma_1.prisma.procurementTransaction.update({
            where: { id: existing.id },
            data: {
                status: input.status,
                updatedBy: actor.userId,
            },
        });
    }
    static async dispatchMl(actor, id) {
        const existing = await prisma_1.prisma.procurementTransaction.findFirst({
            where: {
                companyId: actor.companyId,
                OR: [{ id }, { purchaseId: id }],
            },
            select: {
                id: true,
            },
        });
        if (!existing) {
            throw new app_error_1.AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
        }
        return fraud_dispatch_service_1.FraudDispatchService.dispatchProcurements(actor, [existing.id], "manual");
    }
    static async listTransactionsForFE(companyId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 100;
        const skip = (page - 1) * limit;
        const statusFromView = query.view === "needs_review"
            ? ["alert", "high_alert"]
            : query.view === "waiting_ai"
                ? ["pending"]
                : query.view === "history"
                    ? ["approved", "auto_approved", "rejected"]
                    : undefined;
        const effectiveStatus = query.status?.length ? query.status : statusFromView;
        const department = query.department ?? query.businessUnit;
        const search = query.search?.trim();
        const where = {
            companyId,
            ...(effectiveStatus?.length
                ? {
                    status: {
                        in: effectiveStatus,
                    },
                }
                : {}),
            ...(department && department !== "all"
                ? {
                    department,
                }
                : {}),
            ...(query.searchVendor
                ? {
                    vendorName: {
                        contains: query.searchVendor,
                    },
                }
                : {}),
            ...(query.searchItem
                ? {
                    itemDescription: {
                        contains: query.searchItem,
                    },
                }
                : {}),
            ...(search
                ? {
                    OR: [
                        {
                            vendorName: {
                                contains: search,
                            },
                        },
                        {
                            itemDescription: {
                                contains: search,
                            },
                        },
                        {
                            purchaseId: {
                                contains: search,
                            },
                        },
                        {
                            department: {
                                contains: search,
                            },
                        },
                        {
                            createdByUser: {
                                fullName: {
                                    contains: search,
                                },
                            },
                        },
                        {
                            employee: {
                                fullName: {
                                    contains: search,
                                },
                            },
                        },
                    ],
                }
                : {}),
            ...(query.dateFrom || query.dateTo
                ? {
                    purchaseDate: {
                        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
                    },
                }
                : {}),
        };
        const [items, total, grouped] = await Promise.all([
            prisma_1.prisma.procurementTransaction.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            fullName: true,
                            department: true,
                            position: true,
                            externalRef: true,
                        },
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true,
                        },
                    },
                    updatedByUser: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: {
                    purchaseDate: "desc",
                },
                skip,
                take: limit,
            }),
            prisma_1.prisma.procurementTransaction.count({
                where,
            }),
            prisma_1.prisma.procurementTransaction.groupBy({
                by: ["status"],
                where,
                _count: {
                    status: true,
                },
            }),
        ]);
        const summary = {
            all: grouped.reduce((acc, item) => acc + item._count.status, 0),
            pending: grouped.find((item) => item.status === "pending")?._count.status ?? 0,
            alert: grouped.find((item) => item.status === "alert")?._count.status ?? 0,
            high_alert: grouped.find((item) => item.status === "high_alert")?._count.status ??
                0,
            auto_approved: grouped.find((item) => item.status === "auto_approved")?._count
                .status ?? 0,
            approved: grouped.find((item) => item.status === "approved")?._count.status ?? 0,
            rejected: grouped.find((item) => item.status === "rejected")?._count.status ?? 0,
        };
        const cards = {
            highRisk: summary.high_alert,
            needsReview: summary.alert,
            approved: summary.approved + summary.auto_approved,
            riskyAmount: items
                .filter((item) => item.status === "alert" || item.status === "high_alert")
                .reduce((acc, item) => acc + decimalToNumber(item.amountTotal), 0),
        };
        const tabs = {
            needsReview: summary.alert + summary.high_alert,
            waitingAi: summary.pending,
            history: summary.approved + summary.auto_approved + summary.rejected,
        };
        const filterCounts = {
            all: summary.alert + summary.high_alert,
            highRisk: summary.high_alert,
            needsReview: summary.alert,
        };
        const businessUnits = Array.from(new Set(items
            .map((item) => item.department ?? item.employee?.department ?? null)
            .filter((value) => Boolean(value)))).sort((a, b) => a.localeCompare(b));
        return {
            items: items.map(serializeProcurement),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            summary,
            cards,
            tabs,
            filterCounts,
            businessUnits,
        };
    }
    static async detailTransactionForFE(companyId, id) {
        const item = await prisma_1.prisma.procurementTransaction.findFirst({
            where: {
                companyId,
                OR: [{ id }, { purchaseId: id }],
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        department: true,
                        position: true,
                        externalRef: true,
                    },
                },
                createdByUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
                updatedByUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!item) {
            throw new app_error_1.AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
        }
        return serializeProcurement(item);
    }
    static async updateTransactionStatusForFE(actor, id, input) {
        const existing = await prisma_1.prisma.procurementTransaction.findFirst({
            where: {
                companyId: actor.companyId,
                OR: [{ id }, { purchaseId: id }],
            },
        });
        if (!existing) {
            throw new app_error_1.AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
        }
        if (existing.status === "approved" ||
            existing.status === "rejected" ||
            existing.status === "auto_approved") {
            throw new app_error_1.AppError("Procurement transaction has already been reviewed", 409, "PROCUREMENT_ALREADY_REVIEWED");
        }
        const updated = await prisma_1.prisma.procurementTransaction.update({
            where: {
                id: existing.id,
            },
            data: {
                status: input.status,
                updatedBy: actor.userId,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        department: true,
                        position: true,
                        externalRef: true,
                    },
                },
                createdByUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
                updatedByUser: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                companyId: actor.companyId,
                userId: actor.userId,
                action: `PROCUREMENT_${input.status.toUpperCase()}`,
                targetType: "procurement_transaction",
                targetId: existing.id,
                note: `Procurement transaction ${input.status}`,
                metadata: {
                    previousStatus: existing.status,
                    newStatus: input.status,
                    purchaseId: existing.purchaseId,
                },
            },
        });
        return serializeProcurement(updated);
    }
    static getVendorRiskForProcurement(status) {
        return getVendorProcurementRisk(status);
    }
    static mergeFlags(flags, extraFlags) {
        return mergeFlags(normalizeFlags(flags), extraFlags);
    }
    static maxStatus(currentStatus, candidateStatus) {
        return maxStatus(currentStatus, candidateStatus);
    }
}
exports.ProcurementService = ProcurementService;
