import { prisma } from "../../lib/prisma";

export class DashboardService {
  static async summary(companyId: string) {
    const [
      procurementCount,
      expenseCount,
      procurementAgg,
      expenseAgg,
      procurementStatus,
      expenseStatus,
    ] = await Promise.all([
      prisma.procurementTransaction.count({ where: { companyId } }),
      prisma.expense.count({ where: { companyId } }),
      prisma.procurementTransaction.aggregate({
        where: { companyId, status: { in: ["alert", "high_alert"] } },
        _sum: { amountTotal: true },
      }),
      prisma.expense.aggregate({
        where: { companyId, status: { in: ["alert", "high_alert"] } },
        _sum: { amountTotal: true },
      }),
      prisma.procurementTransaction.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { status: true },
      }),
      prisma.expense.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { status: true },
      }),
    ]);

    return {
      page: "Dashboard",
      totalTransactions: procurementCount + expenseCount,
      needsReview:
        (procurementStatus.find((x) => x.status === "alert")?._count.status ??
          0) +
        (expenseStatus.find((x) => x.status === "alert")?._count.status ?? 0),
      highAlert:
        (procurementStatus.find((x) => x.status === "high_alert")?._count
          .status ?? 0) +
        (expenseStatus.find((x) => x.status === "high_alert")?._count.status ??
          0),
      approved:
        (procurementStatus.find((x) => x.status === "approved")?._count
          .status ?? 0) +
        (expenseStatus.find((x) => x.status === "approved")?._count.status ??
          0),
      riskyAmountTotal:
        Number(procurementAgg._sum.amountTotal ?? 0) +
        Number(expenseAgg._sum.amountTotal ?? 0),
    };
  }

  static async highAlerts(companyId: string) {
    const [procurements, expenses] = await Promise.all([
      prisma.procurementTransaction.findMany({
        where: { companyId, status: "high_alert" },
        orderBy: [{ fraudScore: "desc" }, { updatedAt: "desc" }],
        take: 5,
      }),
      prisma.expense.findMany({
        where: { companyId, status: "high_alert" },
        include: { employee: true },
        orderBy: [{ fraudScore: "desc" }, { updatedAt: "desc" }],
        take: 5,
      }),
    ]);

    return [
      ...procurements.map((item) => ({
        id: item.id,
        module: "Procurement",
        title: `${item.itemDescription} - ${item.vendorName}`,
        amountTotal: item.amountTotal,
        fraudScore: item.fraudScore,
        status: item.status,
      })),
      ...expenses.map((item) => ({
        id: item.id,
        module: "Expense",
        title: item.description,
        amountTotal: item.amountTotal,
        fraudScore: item.fraudScore,
        status: item.status,
      })),
    ]
      .sort((a, b) => Number(b.fraudScore ?? 0) - Number(a.fraudScore ?? 0))
      .slice(0, 5);
  }

  static async latestTransactions(companyId: string) {
    const [procurements, expenses] = await Promise.all([
      prisma.procurementTransaction.findMany({
        where: { companyId },
        include: { employee: true },
        orderBy: { purchaseDate: "desc" },
        take: 5,
      }),
      prisma.expense.findMany({
        where: { companyId },
        include: { employee: true },
        orderBy: { expenseDate: "desc" },
        take: 5,
      }),
    ]);

    return [
      ...procurements.map((item) => ({
        id: item.id,
        code: item.purchaseId,
        date: item.purchaseDate,
        description: item.itemDescription,
        subDescription: `${item.employee?.fullName ?? "-"} · ${item.vendorName}`,
        module: "Procurement",
        amountTotal: item.amountTotal,
        fraudScore: item.fraudScore,
        flags: item.flags,
        status: item.status,
      })),
      ...expenses.map((item) => ({
        id: item.id,
        code: item.expenseId,
        date: item.expenseDate,
        description: item.description,
        subDescription: item.employee.fullName,
        module: "Expense",
        amountTotal: item.amountTotal,
        fraudScore: item.fraudScore,
        flags: item.flags,
        status: item.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }
}
