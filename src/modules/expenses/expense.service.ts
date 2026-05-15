import { ExpenseCategory, Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { groupToStatuses, statusLabel } from "../../core/utils/monitor-status";

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

function categoryLabel(category: ExpenseCategory) {
  const map: Record<ExpenseCategory, string> = {
    entertainment: "Entertainment",
    transport: "Transport",
    office_supply: "Office Supply",
    meals: "Meals",
    vehicle: "Vehicle",
    training: "Training",
    others: "Others",
  };

  return map[category];
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

function isReviewedStatus(status: ReviewStatus) {
  return (
    status === "approved" ||
    status === "rejected" ||
    status === "auto_approved"
  );
}

function statusToFrontendLabel(status: ReviewStatus) {
  const map: Record<ReviewStatus, string> = {
    pending: "Menunggu AI",
    alert: "Perlu Ditinjau",
    high_alert: "Risiko Tinggi",
    auto_approved: "Disetujui Otomatis",
    approved: "Disetujui",
    rejected: "Ditolak",
  };

  return map[status];
}

function statusToFrontendKey(status: ReviewStatus) {
  const map: Record<ReviewStatus, string> = {
    pending: "waiting_ai",
    alert: "needs_review",
    high_alert: "high_risk",
    auto_approved: "auto_approved",
    approved: "approved",
    rejected: "rejected",
  };

  return map[status];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
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

function serializeExpense(item: ExpenseWithRelations, index?: number) {
  const amount = decimalToNumber(item.amountTotal);
  const statusLabelText = statusToFrontendLabel(item.status);
  const statusKey = statusToFrontendKey(item.status);
  const reviewer =
    item.status === "auto_approved"
      ? "Sistem AI"
      : item.status === "approved" || item.status === "rejected"
        ? item.updatedByUser?.fullName ?? "Sudah direview"
        : null;

  return {
    id: item.id,
    no: index,
    expenseId: item.expenseId,
    displayId: item.expenseId ?? item.id,
    shortId: item.id.slice(0, 8),
    expenseDate: item.expenseDate.toISOString(),
    expenseDateLabel: formatDate(item.expenseDate),
    description: item.description,
    merchant: item.merchant ?? "",
    employeeId: item.employeeId,
    employeeName: item.employee.fullName,
    employeeDepartment: item.employee.department ?? item.department ?? "-",
    department: item.department ?? item.employee.department ?? "-",
    category: item.category,
    categoryLabel: categoryLabel(item.category),
    requesterId: item.createdByUser.id,
    requesterName: item.createdByUser.fullName,
    reviewerName: reviewer,
    inputBy: item.createdByUser.fullName,
    reviewedBy: reviewer,
    amount,
    amountTotal: amount,
    fraudScore: item.fraudScore ?? 0,
    flags: normalizeFlags(item.flags),
    status: item.status,
    statusKey,
    statusLabel: statusLabelText,
    aiExplanation: item.aiExplanation ?? "Belum ada analisis AI.",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class ExpenseService {
  static async create(
    actor: { userId: string; companyId: string },
    input: {
      employeeId: string;
      expenseId?: string | null;
      expenseDate: string;
      description: string;
      category: ExpenseCategory;
      merchant?: string | null;
      amountTotal: number;
      department?: string | null;
    },
  ) {
    const employee = await prisma.employee.findFirst({
      where: {
        id: input.employeeId,
        companyId: actor.companyId,
      },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
    }

    return prisma.expense.create({
      data: {
        companyId: actor.companyId,
        employeeId: input.employeeId,
        expenseId: input.expenseId ?? null,
        expenseDate: new Date(input.expenseDate),
        description: input.description,
        category: input.category,
        merchant: input.merchant ?? null,
        amountTotal: input.amountTotal,
        department: input.department ?? employee.department ?? null,
        createdBy: actor.userId,
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
      searchEmployee?: string;
      searchDescription?: string;
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

    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(groupedStatuses
        ? { status: { in: groupedStatuses as ReviewStatus[] } }
        : {}),
      ...(query.department ? { department: query.department } : {}),
      ...(query.searchDescription
        ? { description: { contains: query.searchDescription } }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            expenseDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.searchEmployee
        ? {
            employee: {
              fullName: { contains: query.searchEmployee },
            },
          }
        : {}),
    };

    const [items, total, grouped] = await Promise.all([
      prisma.expense.findMany({
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
        orderBy: { expenseDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
      prisma.expense.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        expenseId: item.expenseId,
        expenseDate: item.expenseDate,

        employeeId: item.employeeId,
        employeeName: item.employee.fullName,
        employee: {
          id: item.employee.id,
          fullName: item.employee.fullName,
          department: item.employee.department,
          position: item.employee.position,
          externalRef: item.employee.externalRef,
        },

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

        department: item.department,
        description: item.description,
        fullName: item.employee.fullName,
        position: item.employee.position,
        amountTotal: item.amountTotal,
        category: item.category,
        categoryLabel: categoryLabel(item.category),
        merchant: item.merchant,
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
    const item = await prisma.expense.findFirst({
      where: { id, companyId },
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
      throw new AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
    }

    return {
      id: item.id,
      expenseId: item.expenseId,
      fraudScore: item.fraudScore,
      aiExplanation: item.aiExplanation,
      flags: normalizeFlags(item.flags),

      employeeId: item.employeeId,
      employeeName: item.employee.fullName,
      employee: item.employee,

      createdBy: item.createdBy,
      createdByName: item.createdByUser.fullName,
      createdByUser: item.createdByUser,

      updatedBy: item.updatedBy,
      updatedByName: item.updatedByUser?.fullName ?? null,
      updatedByUser: item.updatedByUser,

      detail: {
        description: item.description,
        category: item.category,
        categoryLabel: categoryLabel(item.category),
        merchant: item.merchant,
        fullName: item.employee.fullName,
        department: item.department,
        position: item.employee.position,
        expenseDate: item.expenseDate,
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
    const existing = await prisma.expense.findFirst({
      where: { id, companyId: actor.companyId },
    });

    if (!existing) {
      throw new AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
    }

    if (isReviewedStatus(existing.status)) {
      throw new AppError(
        "Expense has already been reviewed",
        409,
        "EXPENSE_ALREADY_REVIEWED",
      );
    }

    return prisma.expense.update({
      where: { id },
      data: {
        status: input.status,
        updatedBy: actor.userId,
      },
    });
  }

  static async listTransactionsForFE(
    companyId: string,
    query: {
      view?: "needs_review" | "waiting_ai" | "history";
      status?: ReviewStatus[];
      department?: string;
      search?: string;
      searchEmployee?: string;
      searchDescription?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const skip = (page - 1) * limit;
    const statusFromView =
      query.view === "needs_review"
        ? (["alert", "high_alert"] as ReviewStatus[])
        : query.view === "waiting_ai"
          ? (["pending"] as ReviewStatus[])
          : query.view === "history"
            ? (["approved", "auto_approved", "rejected"] as ReviewStatus[])
            : undefined;
    const effectiveStatus = query.status?.length ? query.status : statusFromView;
    const search = query.search?.trim();

    const where: Prisma.ExpenseWhereInput = {
      companyId,

      ...(effectiveStatus?.length
        ? {
            status: {
              in: effectiveStatus,
            },
          }
        : {}),

      ...(query.department && query.department !== "all"
        ? {
            department: query.department,
          }
        : {}),

      ...(query.searchDescription
        ? {
            description: {
              contains: query.searchDescription,
            },
          }
        : {}),

      ...(query.searchEmployee
        ? {
            employee: {
              fullName: {
                contains: query.searchEmployee,
              },
            },
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                expenseId: {
                  contains: search,
                },
              },
              {
                description: {
                  contains: search,
                },
              },
              {
                merchant: {
                  contains: search,
                },
              },
              {
                department: {
                  contains: search,
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
            expenseDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total, grouped] = await Promise.all([
      prisma.expense.findMany({
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
          expenseDate: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
      prisma.expense.groupBy({
        by: ["status"],
        where,
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

    const filterCounts =
      query.view === "history"
        ? {
            all: tabs.history,
            approved: summary.approved,
            autoApproved: summary.auto_approved,
            rejected: summary.rejected,
          }
        : {
            all: tabs.needsReview,
            highRisk: summary.high_alert,
            needsReview: summary.alert,
          };

    const departments = Array.from(
      new Set(
        items
          .map((item) => item.department ?? item.employee.department ?? null)
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return {
      items: items.map((item, index) => serializeExpense(item, skip + index + 1)),
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
      departments,
    };
  }

  static async detailTransactionForFE(companyId: string, id: string) {
    const item = await prisma.expense.findFirst({
      where: {
        companyId,
        OR: [{ id }, { expenseId: id }],
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
      throw new AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
    }

    return serializeExpense(item);
  }

  static async updateTransactionStatusForFE(
    actor: { userId: string; companyId: string },
    id: string,
    input: {
      status: "approved" | "rejected";
    },
  ) {
    const existing = await prisma.expense.findFirst({
      where: {
        companyId: actor.companyId,
        OR: [{ id }, { expenseId: id }],
      },
    });

    if (!existing) {
      throw new AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
    }

    if (isReviewedStatus(existing.status)) {
      throw new AppError(
        "Expense has already been reviewed",
        409,
        "EXPENSE_ALREADY_REVIEWED",
      );
    }

    const updated = await prisma.expense.update({
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
        action: `EXPENSE_${input.status.toUpperCase()}`,
        targetType: "expense",
        targetId: existing.id,
        note: `Expense transaction ${input.status}`,
        metadata: {
          previousStatus: existing.status,
          newStatus: input.status,
          expenseId: existing.expenseId,
        },
      },
    });

    return serializeExpense(updated);
  }
}
