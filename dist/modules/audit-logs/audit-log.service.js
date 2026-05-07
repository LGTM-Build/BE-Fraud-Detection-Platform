"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const prisma_1 = require("../../lib/prisma");
class AuditLogService {
    static async create(input) {
        return prisma_1.prisma.auditLog.create({
            data: {
                companyId: input.companyId,
                userId: input.userId,
                action: input.action,
                targetType: input.targetType,
                targetId: input.targetId ?? null,
                note: input.note ?? null,
                metadata: input.metadata,
            },
        });
    }
    static async list(companyId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const where = {
            companyId,
            ...(query.action ? { action: query.action } : {}),
            ...(query.targetType ? { targetType: query.targetType } : {}),
            ...(query.userId ? { userId: query.userId } : {}),
        };
        const [items, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.auditLog.count({ where }),
        ]);
        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
exports.AuditLogService = AuditLogService;
