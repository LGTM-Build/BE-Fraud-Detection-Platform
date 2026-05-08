import { Prisma, ProcurementMethod, ReviewStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { groupToStatuses, statusLabel } from "../../core/utils/monitor-status";
import { FraudDispatchService } from "../integrations/fraud/fraud-dispatch.service";

function normalizeFlags(flags: unknown): string[] {
  if (!flags) return [];
  if (Array.isArray(flags)) return flags.filter(Boolean).map(String);

  if (typeof flags === "object") {
    return Object.entries(flags as Record<string, unknown>)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
  }

  return [];
}

function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "object" && "toNumber" in value) {
    return value.toNumber();
  }

  return Number(value);
}

function procurementMethodLabel(method: ProcurementMethod) {
  const map: Record<ProcurementMethod, string> = {
    pengadaan_langsung: "Pengadaan Langsung",
    tender_terbuka: "Tender Terbuka",
    tender_tertutup: "Tender Tertutup",
    e_purchasing: "E-Purchasing",
    rfp: "RFP",
    lainnya: "Lainnya",
  };

  return map[method];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

type ProcurementWithRelations = Prisma.ProcurementTransactionGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        fullName: true;
        department: true;
        position: true;
        externalRef: true;
      };
    };
    createdByUser: {
      select: {
        id: true;
        fullName: true;
        email: true;
        role: true;
      };
    };
    updatedByUser: {
      select: {
        id: true;
        fullName: true;
        email: true;
        role: true;
      };
    };
  };
}>;

function serializeProcurement(item: ProcurementWithRelations) {
  const amount = decimalToNumber(item.amountTotal);

  return {
    id: item.id,
    purchaseId: item.purchaseId,
    purchaseDate: formatDate(item.purchaseDate),
    vendorName: item.vendorName,
    itemDescription: item.itemDescription,
    department: item.department,
    requester: item.createdByUser.fullName,
    approver: item.updatedByUser?.fullName ?? "-",
    amount,
    fraudScore: item.fraudScore ?? 0,
    flags: normalizeFlags(item.flags),
    status: item.status,
    procurementMethod: procurementMethodLabel(item.procurementMethod),
    aiExplanation: item.aiExplanation ?? "Belum ada analisis AI.",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class ProcurementService {
  static async create(
    actor: { userId: string; companyId: string },
    input: {
      employeeId?: string | null;
      purchaseId?: string | null;
      purchaseDate: string;
      vendorName: string;
      itemDescription: string;
      department?: string | null;
      amountTotal: number;
      procurementMethod?: ProcurementMethod;
    },
  ) {
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

    return prisma.procurementTransaction.create({
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

  static async update(
    actor: { userId: string; companyId: string },
    id: string,
    input: Partial<{
      employeeId?: string | null;
      purchaseId?: string | null;
      purchaseDate: string;
      vendorName: string;
      itemDescription: string;
      department?: string | null;
      amountTotal: number;
      procurementMethod?: ProcurementMethod;
    }>,
  ) {
    const existing = await prisma.procurementTransaction.findFirst({
      where: {
        companyId: actor.companyId,
        OR: [{ id }, { purchaseId: id }],
      },
    });

    if (!existing) {
      throw new AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
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

    return prisma.procurementTransaction.update({
      where: { id: existing.id },
      data: {
        employeeId:
          input.employeeId === undefined
            ? existing.employeeId
            : input.employeeId,
        purchaseId:
          input.purchaseId === undefined
            ? existing.purchaseId
            : input.purchaseId,
        purchaseDate: input.purchaseDate
          ? new Date(input.purchaseDate)
          : existing.purchaseDate,
        vendorName: input.vendorName ?? existing.vendorName,
        itemDescription: input.itemDescription ?? existing.itemDescription,
        department:
          input.department === undefined
            ? existing.department
            : input.department,
        amountTotal: input.amountTotal ?? existing.amountTotal,
        procurementMethod:
          input.procurementMethod === undefined
            ? existing.procurementMethod
            : input.procurementMethod,
        updatedBy: actor.userId,
      },
      include: {
        employee: true,
      },
    });
  }

  static async listMonitor(
    companyId: string,
    query: {
      status?: ReviewStatus;
      group?: string;
      department?: string;
      searchVendor?: string;
      searchItem?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const groupedStatuses = groupToStatuses(query.group);

    const where: Prisma.ProcurementTransactionWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(groupedStatuses
        ? { status: { in: groupedStatuses as ReviewStatus[] } }
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
      prisma.procurementTransaction.findMany({
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
      prisma.procurementTransaction.count({ where }),
      prisma.procurementTransaction.groupBy({
        by: ["status"],
        where: { companyId },
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
        statusLabel: statusLabel(item.status as any),
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
        highAlert:
          grouped.find((x) => x.status === "high_alert")?._count.status ?? 0,
        alert: grouped.find((x) => x.status === "alert")?._count.status ?? 0,
        autoApproved:
          grouped.find((x) => x.status === "auto_approved")?._count.status ?? 0,
        approved:
          grouped.find((x) => x.status === "approved")?._count.status ?? 0,
        rejected:
          grouped.find((x) => x.status === "rejected")?._count.status ?? 0,
        pending:
          grouped.find((x) => x.status === "pending")?._count.status ?? 0,
      },
    };
  }

  static async detailMonitor(companyId: string, id: string) {
    const item = await prisma.procurementTransaction.findFirst({
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
      throw new AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
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
        requester: item.employee?.fullName ?? null,
        approver: item.updatedByUser?.fullName ?? null,
        procurementMethod: item.procurementMethod,
        procurementMethodLabel: procurementMethodLabel(item.procurementMethod),
        amountTotal: item.amountTotal,
        status: item.status,
        statusLabel: statusLabel(item.status as any),
      },
    };
  }

  static async review(
    actor: { userId: string; companyId: string },
    id: string,
    input: { status: "approved" | "rejected" },
  ) {
    const existing = await prisma.procurementTransaction.findFirst({
      where: {
        companyId: actor.companyId,
        OR: [{ id }, { purchaseId: id }],
      },
    });

    if (!existing) {
      throw new AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
    }

    return prisma.procurementTransaction.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        updatedBy: actor.userId,
      },
    });
  }

  static async dispatchMl(
    actor: { userId: string; companyId: string },
    id: string,
  ) {
    return FraudDispatchService.dispatchProcurements(actor, [id], "manual");
  }

  static async listTransactionsForFE(
    companyId: string,
    query: {
      status?: ReviewStatus[];
      businessUnit?: string;
      department?: string;
      search?: string;
      searchVendor?: string;
      searchItem?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const skip = (page - 1) * limit;

    const department = query.department ?? query.businessUnit;
    const search = query.search?.trim();

    const where: Prisma.ProcurementTransactionWhereInput = {
      companyId,

      ...(query.status?.length
        ? {
            status: {
              in: query.status,
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
      prisma.procurementTransaction.findMany({
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

      prisma.procurementTransaction.count({
        where,
      }),

      prisma.procurementTransaction.groupBy({
        by: ["status"],
        where: {
          companyId,
        },
        _count: {
          status: true,
        },
      }),
    ]);

    const summary = {
      all: grouped.reduce((acc, item) => acc + item._count.status, 0),
      pending:
        grouped.find((item) => item.status === "pending")?._count.status ?? 0,
      alert:
        grouped.find((item) => item.status === "alert")?._count.status ?? 0,
      high_alert:
        grouped.find((item) => item.status === "high_alert")?._count.status ??
        0,
      auto_approved:
        grouped.find((item) => item.status === "auto_approved")?._count
          .status ?? 0,
      approved:
        grouped.find((item) => item.status === "approved")?._count.status ?? 0,
      rejected:
        grouped.find((item) => item.status === "rejected")?._count.status ?? 0,
    };

    return {
      items: items.map(serializeProcurement),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  static async detailTransactionForFE(companyId: string, id: string) {
    const item = await prisma.procurementTransaction.findFirst({
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
      throw new AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
    }

    return serializeProcurement(item);
  }

  static async updateTransactionStatusForFE(
    actor: { userId: string; companyId: string },
    id: string,
    input: {
      status: "approved" | "rejected";
    },
  ) {
    const existing = await prisma.procurementTransaction.findFirst({
      where: {
        companyId: actor.companyId,
        OR: [{ id }, { purchaseId: id }],
      },
    });

    if (!existing) {
      throw new AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
    }

    if (
      existing.status === "approved" ||
      existing.status === "rejected" ||
      existing.status === "auto_approved"
    ) {
      throw new AppError(
        "Procurement transaction has already been reviewed",
        409,
        "PROCUREMENT_ALREADY_REVIEWED",
      );
    }

    const updated = await prisma.procurementTransaction.update({
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

    await prisma.auditLog.create({
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
}
