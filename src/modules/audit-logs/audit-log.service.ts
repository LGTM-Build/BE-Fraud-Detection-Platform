import { prisma } from "../../lib/prisma";

type CreateAuditLogInput = {
  companyId: string;
  userId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  note?: string | null;
  metadata?: unknown;
};

export class AuditLogService {
  static async create(input: CreateAuditLogInput) {
    return prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        note: input.note ?? null,
        metadata: input.metadata as any,
      },
    });
  }

  static async list(
    companyId: string,
    query: {
      action?: string;
      targetType?: string;
      userId?: string;
      page?: number;
      limit?: number;
    },
  ) {
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
      prisma.auditLog.findMany({
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
      prisma.auditLog.count({ where }),
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
