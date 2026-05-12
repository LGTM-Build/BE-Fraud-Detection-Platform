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

function isReviewedStatus(status: ReviewStatus) {
  return (
    status === "approved" ||
    status === "rejected" ||
    status === "auto_approved"
  );
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
}
