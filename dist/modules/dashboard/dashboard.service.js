"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const prisma_1 = require("../../lib/prisma");
class DashboardService {
    static async summary(companyId) {
        const [procurementCount, expenseCount, procurementAgg, expenseAgg, procurementStatus, expenseStatus,] = await Promise.all([
            prisma_1.prisma.procurementTransaction.count({ where: { companyId } }),
            prisma_1.prisma.expense.count({ where: { companyId } }),
            prisma_1.prisma.procurementTransaction.aggregate({
                where: { companyId, status: { in: ["alert", "high_alert"] } },
                _sum: { amountTotal: true },
            }),
            prisma_1.prisma.expense.aggregate({
                where: { companyId, status: { in: ["alert", "high_alert"] } },
                _sum: { amountTotal: true },
            }),
            prisma_1.prisma.procurementTransaction.groupBy({
                by: ["status"],
                where: { companyId },
                _count: { status: true },
            }),
            prisma_1.prisma.expense.groupBy({
                by: ["status"],
                where: { companyId },
                _count: { status: true },
            }),
        ]);
        const procurementAlert = procurementStatus.find((x) => x.status === "alert")?._count.status ?? 0;
        const procurementHighAlert = procurementStatus.find((x) => x.status === "high_alert")?._count.status ??
            0;
        const expenseAlert = expenseStatus.find((x) => x.status === "alert")?._count.status ?? 0;
        const expenseHighAlert = expenseStatus.find((x) => x.status === "high_alert")?._count.status ?? 0;
        return {
            page: "Dashboard",
            totalTransactions: procurementCount + expenseCount,
            // Semua transaksi yang perlu tindakan review
            needsReview: procurementAlert +
                procurementHighAlert +
                expenseAlert +
                expenseHighAlert,
            // Khusus high risk
            highAlert: procurementHighAlert + expenseHighAlert,
            approved: (procurementStatus.find((x) => x.status === "approved")?._count
                .status ?? 0) +
                (expenseStatus.find((x) => x.status === "approved")?._count.status ??
                    0),
            riskyAmountTotal: Number(procurementAgg._sum.amountTotal ?? 0) +
                Number(expenseAgg._sum.amountTotal ?? 0),
        };
    }
    static async highAlerts(companyId) {
        const [procurements, expenses] = await Promise.all([
            prisma_1.prisma.procurementTransaction.findMany({
                where: { companyId, status: "high_alert" },
                orderBy: [{ fraudScore: "desc" }, { updatedAt: "desc" }],
                take: 5,
            }),
            prisma_1.prisma.expense.findMany({
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
    static async latestTransactions(companyId) {
        const [procurements, expenses] = await Promise.all([
            prisma_1.prisma.procurementTransaction.findMany({
                where: { companyId },
                include: { employee: true },
                orderBy: { purchaseDate: "desc" },
                take: 5,
            }),
            prisma_1.prisma.expense.findMany({
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
    static async fraudTrend(companyId, query) {
        const year = query.year ?? new Date().getFullYear();
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        const monthLabels = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "Mei",
            "Jun",
            "Jul",
            "Agu",
            "Sep",
            "Okt",
            "Nov",
            "Des",
        ];
        const trendMap = new Map();
        for (let month = 1; month <= 12; month++) {
            trendMap.set(month, {
                label: monthLabels[month - 1],
                month,
                expense: 0,
                procurement: 0,
                total: 0,
            });
        }
        const [procurements, expenses] = await Promise.all([
            prisma_1.prisma.procurementTransaction.findMany({
                where: {
                    companyId,
                    status: {
                        in: ["alert", "high_alert"],
                    },
                    purchaseDate: {
                        gte: startDate,
                        lt: endDate,
                    },
                },
                select: {
                    id: true,
                    purchaseDate: true,
                },
            }),
            prisma_1.prisma.expense.findMany({
                where: {
                    companyId,
                    status: {
                        in: ["alert", "high_alert"],
                    },
                    expenseDate: {
                        gte: startDate,
                        lt: endDate,
                    },
                },
                select: {
                    id: true,
                    expenseDate: true,
                },
            }),
        ]);
        for (const item of procurements) {
            const month = item.purchaseDate.getMonth() + 1;
            const current = trendMap.get(month);
            if (!current)
                continue;
            current.procurement += 1;
            current.total += 1;
        }
        for (const item of expenses) {
            const month = item.expenseDate.getMonth() + 1;
            const current = trendMap.get(month);
            if (!current)
                continue;
            current.expense += 1;
            current.total += 1;
        }
        return {
            period: query.period ?? "monthly",
            year,
            items: Array.from(trendMap.values()),
        };
    }
}
exports.DashboardService = DashboardService;
