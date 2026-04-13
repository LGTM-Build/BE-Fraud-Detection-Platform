import { prisma } from "../../lib/prisma";

type CreateAuditLogInput = {
  companyId: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  note?: string | null;
  metadata?: unknown;
};

export class AuditLogService {
  static async create(input: CreateAuditLogInput) {
    const { companyId, userId, action, targetType, targetId, note, metadata } =
      input;
    return prisma.auditLog.create({
      data: {
        companyId,
        userId,
        action,
        targetType,
        targetId: targetId ?? null,
        note: note ?? null,
        metadata: metadata as any,
      },
    });
  }
}
