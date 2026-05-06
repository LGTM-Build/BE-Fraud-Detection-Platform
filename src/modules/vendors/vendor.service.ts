import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { AuditLogService } from "../audit-logs/audit-log.service";

export class VendorService {
  static async list(companyId: string) {
    return prisma.vendor.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async detail(companyId: string, id: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id, companyId },
    });

    if (!vendor) {
      throw new AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
    }

    return vendor;
  }

  static async create(
    actor: { userId: string; companyId: string },
    input: {
      vendorName: string;
      vendorRegistrationDate?: string | null;
      vendorBankAccount?: string | null;
      vendorAddress?: string | null;
      vendorContact?: string | null;
      externalRef?: string | null;
      metadata?: unknown;
      status?: "active" | "inactive" | "blacklisted";
    },
  ) {
    if (input.externalRef) {
      const duplicate = await prisma.vendor.findFirst({
        where: {
          companyId: actor.companyId,
          externalRef: input.externalRef,
        },
      });

      if (duplicate) {
        throw new AppError(
          "External ref already exists",
          409,
          "VENDOR_EXTERNAL_REF_EXISTS",
        );
      }
    }

    const vendor = await prisma.vendor.create({
      data: {
        companyId: actor.companyId,
        vendorName: input.vendorName,
        vendorRegistrationDate: input.vendorRegistrationDate
          ? new Date(input.vendorRegistrationDate)
          : null,
        vendorBankAccount: input.vendorBankAccount ?? null,
        vendorAddress: input.vendorAddress ?? null,
        vendorContact: input.vendorContact ?? null,
        externalRef: input.externalRef ?? null,
        metadata: input.metadata as any,
        status: input.status ?? "active",
      },
    });

    await AuditLogService.create({
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

  static async update(
    actor: { userId: string; companyId: string },
    id: string,
    input: {
      vendorName?: string;
      metadata?: unknown;
      status?: "active" | "inactive" | "blacklisted";
    },
  ) {
    const existing = await prisma.vendor.findFirst({
      where: { id, companyId: actor.companyId },
    });

    if (!existing) {
      throw new AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
    }

    const updated = await prisma.vendor.update({
      where: { id: existing.id },
      data: {
        vendorName: input.vendorName ?? existing.vendorName,
        metadata:
          input.metadata === undefined
            ? existing.metadata
            : (input.metadata as any),
        status: input.status ?? existing.status,
      },
    });

    await AuditLogService.create({
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

  static async updateStatus(
    actor: { userId: string; companyId: string },
    id: string,
    status: "active" | "inactive" | "blacklisted",
  ) {
    const existing = await prisma.vendor.findFirst({
      where: { id, companyId: actor.companyId },
    });

    if (!existing) {
      throw new AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
    }

    const updated = await prisma.vendor.update({
      where: { id: existing.id },
      data: { status },
    });

    await AuditLogService.create({
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
