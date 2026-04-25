import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { AuditLogService } from "../audit-logs/audit-log.service";
import { FraudDispatchService } from "../integrations/fraud/fraud-dispatch.service";

const toPrismaJson = (
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
};

type ReviewStatus =
  | "pending"
  | "reviewed"
  | "requires_attention"
  | "need_further_review";

type ProcurementMethod =
  | "pengadaan_langsung"
  | "tender_terbuka"
  | "tender_tertutup"
  | "e_purchasing"
  | "rfp"
  | "lainnya";

type CreateProcurementInput = {
  vendorId: string;
  employeeId?: string | null;
  purchaseId?: string | null;
  poNumber?: string | null;
  purchaseDate: string;
  itemId?: string | null;
  itemDescription?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  amountTotal: number;
  department?: string | null;
  method?: ProcurementMethod;
  approvalDate?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  location?: string | null;
  contractId?: string | null;
  contractDate?: string | null;
  paymentDate?: string | null;
  metadata?: unknown;
};

type UpdateProcurementInput = Partial<CreateProcurementInput>;

type UpdateProcurementStatusInput = {
  status: ReviewStatus;
  reviewerNote?: string | null;
};

type ListProcurementQuery = {
  status?: ReviewStatus;
  department?: string;
  vendorId?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  limit?: number;
};

const reviewStatusLabelMap: Record<ReviewStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  requires_attention: "Requires Attention",
  need_further_review: "Need Further Review",
};

const procurementMethodLabelMap: Record<ProcurementMethod, string> = {
  pengadaan_langsung: "Pengadaan Langsung",
  tender_terbuka: "Tender Terbuka",
  tender_tertutup: "Tender Tertutup",
  e_purchasing: "E-Purchasing",
  rfp: "RFP",
  lainnya: "Lainnya",
};

const vendorStatusLabelMap: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  blacklisted: "Blacklisted",
};

function mapProcurementResponse(item: any) {
  const latestFraud = item.fraudResults?.[0];
  const flags = latestFraud?.flags as
    | string[]
    | Record<string, unknown>
    | null
    | undefined;

  let uiFlags: string[] = [];
  if (Array.isArray(flags)) {
    uiFlags = flags;
  } else if (flags && typeof flags === "object") {
    uiFlags = Object.entries(flags)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
  }

  return {
    id: item.id,
    procurementId: item.purchaseId,
    poNumber: item.poNumber,
    date: item.purchaseDate,
    vendor: {
      id: item.vendor.id,
      name: item.vendor.vendorName,
      bankAccount: item.vendor.vendorBankAccount,
      registrationDate: item.vendor.vendorRegistrationDate,
      address: item.vendor.vendorAddress,
      contact: item.vendor.vendorContact,
      status: item.vendor.status,
      statusLabel:
        vendorStatusLabelMap[item.vendor.status] ?? item.vendor.status,
    },
    item: {
      id: item.itemId,
      description: item.itemDescription,
    },
    department: item.department,
    method: item.method,
    methodLabel:
      procurementMethodLabelMap[item.method as ProcurementMethod] ??
      item.method,
    total: item.amountTotal,
    employee: item.employee
      ? {
          id: item.employee.id,
          name: item.employee.fullName,
          department: item.employee.department,
          position: item.employee.position,
        }
      : null,
    score: latestFraud?.fraudScore ?? null,
    flags: uiFlags,
    status: item.status,
    statusLabel:
      reviewStatusLabelMap[item.status as ReviewStatus] ?? item.status,
    review: {
      reviewerNote: item.reviewerNote,
      reviewedBy: item.reviewedBy,
      reviewedAt: item.reviewedAt,
    },
    invoice: {
      number: item.invoiceNumber,
      date: item.invoiceDate,
    },
    contract: {
      id: item.contractId,
      date: item.contractDate,
    },
    paymentDate: item.paymentDate,
    location: item.location,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class ProcurementService {
  static async create(
    actor: { userId: string; companyId: string },
    input: CreateProcurementInput,
  ) {
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: input.vendorId,
        companyId: actor.companyId,
      },
    });

    if (!vendor) {
      throw new AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
    }

    if (input.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: input.employeeId,
          companyId: actor.companyId,
        },
      });

      if (!employee) {
        throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
      }
    }

    const procurement = await prisma.procurementTransaction.create({
      data: {
        companyId: actor.companyId,
        vendorId: input.vendorId,
        employeeId: input.employeeId ?? null,
        purchaseId: input.purchaseId ?? null,
        poNumber: input.poNumber ?? null,
        purchaseDate: new Date(input.purchaseDate),
        itemId: input.itemId ?? null,
        itemDescription: input.itemDescription ?? null,
        quantity: input.quantity ?? null,
        unitPrice: input.unitPrice ?? null,
        amountTotal: input.amountTotal,
        department: input.department ?? null,
        method: input.method ?? "lainnya",
        approvalDate: input.approvalDate ? new Date(input.approvalDate) : null,
        invoiceNumber: input.invoiceNumber ?? null,
        invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null,
        location: input.location ?? null,
        contractId: input.contractId ?? null,
        contractDate: input.contractDate ? new Date(input.contractDate) : null,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : null,
        metadata: toPrismaJson(input.metadata),
        createdBy: actor.userId,
      },
      include: {
        vendor: true,
        employee: true,
      },
    });

    await AuditLogService.create({
      companyId: actor.companyId,
      userId: actor.userId,
      action: "create_procurement_transaction",
      targetType: "procurement_transaction",
      targetId: procurement.id,
      note: "Created procurement transaction",
      metadata: {
        poNumber: procurement.poNumber,
        purchaseId: procurement.purchaseId,
        vendorId: procurement.vendorId,
        amountTotal: procurement.amountTotal,
      },
    });

    let fraudDispatch: any = null;
    let fraudDispatchError: string | null = null;

    try {
      fraudDispatch = await FraudDispatchService.dispatchProcurement(
        procurement.id,
      );
    } catch (error: any) {
      fraudDispatchError =
        error.message ?? "Failed to dispatch to fraud service";
    }

    return {
      procurement,
      fraudDispatch,
      fraudDispatchError,
    };
  }

  static async update(
    actor: { userId: string; companyId: string },
    id: string,
    input: UpdateProcurementInput,
  ) {
    const existing = await prisma.procurementTransaction.findFirst({
      where: {
        id,
        companyId: actor.companyId,
      },
    });

    if (!existing) {
      throw new AppError(
        "Procurement transaction not found",
        404,
        "PROCUREMENT_NOT_FOUND",
      );
    }

    if (input.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: input.vendorId,
          companyId: actor.companyId,
        },
      });

      if (!vendor) {
        throw new AppError("Vendor not found", 404, "VENDOR_NOT_FOUND");
      }
    }

    if (input.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: input.employeeId,
          companyId: actor.companyId,
        },
      });

      if (!employee) {
        throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
      }
    }

    const updated = await prisma.procurementTransaction.update({
      where: { id: existing.id },
      data: {
        vendorId: input.vendorId ?? existing.vendorId,
        employeeId:
          input.employeeId === undefined
            ? existing.employeeId
            : input.employeeId,
        purchaseId:
          input.purchaseId === undefined
            ? existing.purchaseId
            : input.purchaseId,
        poNumber:
          input.poNumber === undefined ? existing.poNumber : input.poNumber,
        purchaseDate: input.purchaseDate
          ? new Date(input.purchaseDate)
          : existing.purchaseDate,
        itemId: input.itemId === undefined ? existing.itemId : input.itemId,
        itemDescription:
          input.itemDescription === undefined
            ? existing.itemDescription
            : input.itemDescription,
        quantity:
          input.quantity === undefined ? existing.quantity : input.quantity,
        unitPrice:
          input.unitPrice === undefined ? existing.unitPrice : input.unitPrice,
        amountTotal:
          input.amountTotal === undefined
            ? existing.amountTotal
            : input.amountTotal,
        department:
          input.department === undefined
            ? existing.department
            : input.department,
        method: input.method ?? existing.method,
        approvalDate:
          input.approvalDate === undefined
            ? existing.approvalDate
            : input.approvalDate
              ? new Date(input.approvalDate)
              : null,
        invoiceNumber:
          input.invoiceNumber === undefined
            ? existing.invoiceNumber
            : input.invoiceNumber,
        invoiceDate:
          input.invoiceDate === undefined
            ? existing.invoiceDate
            : input.invoiceDate
              ? new Date(input.invoiceDate)
              : null,
        location:
          input.location === undefined ? existing.location : input.location,
        contractId:
          input.contractId === undefined
            ? existing.contractId
            : input.contractId,
        contractDate:
          input.contractDate === undefined
            ? existing.contractDate
            : input.contractDate
              ? new Date(input.contractDate)
              : null,
        paymentDate:
          input.paymentDate === undefined
            ? existing.paymentDate
            : input.paymentDate
              ? new Date(input.paymentDate)
              : null,
        metadata:
          input.metadata === undefined
            ? undefined
            : toPrismaJson(input.metadata),
        updatedBy: actor.userId,
      },
      include: {
        vendor: true,
        employee: true,
      },
    });

    await AuditLogService.create({
      companyId: actor.companyId,
      userId: actor.userId,
      action: "update_procurement_transaction",
      targetType: "procurement_transaction",
      targetId: updated.id,
      note: "Updated procurement transaction",
      metadata: {
        before: {
          poNumber: existing.poNumber,
          amountTotal: existing.amountTotal,
          status: existing.status,
        },
        after: {
          poNumber: updated.poNumber,
          amountTotal: updated.amountTotal,
          status: updated.status,
        },
      },
    });

    return updated;
  }

  static async detail(companyId: string, id: string) {
    const item = await prisma.procurementTransaction.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        vendor: true,
        employee: true,
        fraudResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!item) {
      throw new AppError(
        "Procurement transaction not found",
        404,
        "PROCUREMENT_NOT_FOUND",
      );
    }

    return mapProcurementResponse(item);
  }

  static async updateStatus(
    actor: { userId: string; companyId: string },
    id: string,
    input: UpdateProcurementStatusInput,
  ) {
    const existing = await prisma.procurementTransaction.findFirst({
      where: {
        id,
        companyId: actor.companyId,
      },
    });

    if (!existing) {
      throw new AppError(
        "Procurement transaction not found",
        404,
        "PROCUREMENT_NOT_FOUND",
      );
    }

    const updated = await prisma.procurementTransaction.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        reviewerNote: input.reviewerNote ?? null,
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        updatedBy: actor.userId,
      },
    });

    await AuditLogService.create({
      companyId: actor.companyId,
      userId: actor.userId,
      action: "update_procurement_status",
      targetType: "procurement_transaction",
      targetId: updated.id,
      note: `Procurement status changed from ${existing.status} to ${updated.status}`,
      metadata: {
        previousStatus: existing.status,
        currentStatus: updated.status,
        reviewerNote: updated.reviewerNote,
      },
    });

    return updated;
  }

  static async list(companyId: string, query: ListProcurementQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const fraudScoreFilter: Prisma.ProcurementTransactionWhereInput =
      query.minScore !== undefined || query.maxScore !== undefined
        ? {
            fraudResults: {
              some: {
                fraudScore: {
                  ...(query.minScore !== undefined
                    ? { gte: query.minScore }
                    : {}),
                  ...(query.maxScore !== undefined
                    ? { lte: query.maxScore }
                    : {}),
                },
              },
            },
          }
        : {};

    const where: Prisma.ProcurementTransactionWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.department ? { department: query.department } : {}),
      ...(query.vendorId ? { vendorId: query.vendorId } : {}),
      ...fraudScoreFilter,
    };

    const [items, total, statusCounts] = await Promise.all([
      prisma.procurementTransaction.findMany({
        where,
        include: {
          vendor: true,
          employee: true,
          fraudResults: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { purchaseDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.procurementTransaction.count({ where }),
      prisma.procurementTransaction.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { status: true },
      }),
    ]);

    const mappedItems = items.map(mapProcurementResponse);

    const summary = {
      semua: statusCounts.reduce(
        (acc: number, curr) => acc + curr._count.status,
        0,
      ),
      byStatus: {
        pending:
          statusCounts.find((x) => x.status === "pending")?._count.status ?? 0,
        reviewed:
          statusCounts.find((x) => x.status === "reviewed")?._count.status ?? 0,
        requires_attention:
          statusCounts.find((x) => x.status === "requires_attention")?._count
            .status ?? 0,
        need_further_review:
          statusCounts.find((x) => x.status === "need_further_review")?._count
            .status ?? 0,
      },
      byStatusLabel: {
        Pending:
          statusCounts.find((x) => x.status === "pending")?._count.status ?? 0,
        Reviewed:
          statusCounts.find((x) => x.status === "reviewed")?._count.status ?? 0,
        "Requires Attention":
          statusCounts.find((x) => x.status === "requires_attention")?._count
            .status ?? 0,
        "Need Further Review":
          statusCounts.find((x) => x.status === "need_further_review")?._count
            .status ?? 0,
      },
    };

    return {
      items: mappedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }
}
