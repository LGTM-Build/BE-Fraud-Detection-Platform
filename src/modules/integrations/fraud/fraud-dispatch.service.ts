import { env } from "../../../config/env";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../core/errors/app-error";
import {
  FraudClient,
  FraudHistorySummaryPayload,
} from "./fraud.client";

function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function standardDeviation(values: number[]) {
  if (!values.length) return null;

  const avg = mean(values);

  if (avg === null) return null;

  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function buildStatsSummary(
  scope: "vendor" | "employee",
  amounts: number[],
  duplicateReferenceCount?: number,
): FraudHistorySummaryPayload {
  const transactionCount = amounts.length;

  return {
    scope,
    transactionCount,
    amountMean: mean(amounts),
    amountMedian: median(amounts),
    amountStd: standardDeviation(amounts),
    ...(duplicateReferenceCount !== undefined
      ? { duplicateReferenceCount }
      : {}),
    historyReady: transactionCount >= 2,
    source: "backend_db",
  };
}

export class FraudDispatchService {
  private static async buildProcurementHistorySummaries(
    companyId: string,
    procurements: Array<{
      id: string;
      purchaseId: string | null;
      vendorName: string;
    }>,
  ) {
    const vendorNames = Array.from(
      new Set(
        procurements
          .map((item) => item.vendorName.trim())
          .filter((value) => value.length > 0),
      ),
    );

    if (!vendorNames.length) {
      return new Map<string, FraudHistorySummaryPayload>();
    }

    const historyRows = await prisma.procurementTransaction.findMany({
      where: {
        companyId,
        vendorName: {
          in: vendorNames,
        },
        id: {
          notIn: procurements.map((item) => item.id),
        },
      },
      select: {
        vendorName: true,
        amountTotal: true,
        purchaseId: true,
      },
    });

    const historyByVendor = new Map<
      string,
      Array<{
        amountTotal: number;
        purchaseId: string | null;
      }>
    >();

    for (const row of historyRows) {
      const key = row.vendorName.trim();
      const current = historyByVendor.get(key) ?? [];

      current.push({
        amountTotal: toNumber(row.amountTotal),
        purchaseId: row.purchaseId,
      });

      historyByVendor.set(key, current);
    }

    return new Map(
      procurements.map((item) => {
        const history = historyByVendor.get(item.vendorName.trim()) ?? [];
        const duplicateReferenceCount = item.purchaseId
          ? history.filter((row) => row.purchaseId === item.purchaseId).length
          : 0;

        return [
          item.id,
          buildStatsSummary(
            "vendor",
            history.map((row) => row.amountTotal),
            duplicateReferenceCount,
          ),
        ];
      }),
    );
  }

  private static async buildExpenseHistorySummaries(
    companyId: string,
    expenses: Array<{
      id: string;
      employeeId: string;
    }>,
  ) {
    const employeeIds = Array.from(
      new Set(expenses.map((item) => item.employeeId).filter(Boolean)),
    );

    if (!employeeIds.length) {
      return new Map<string, FraudHistorySummaryPayload>();
    }

    const historyRows = await prisma.expense.findMany({
      where: {
        companyId,
        employeeId: {
          in: employeeIds,
        },
        id: {
          notIn: expenses.map((item) => item.id),
        },
      },
      select: {
        employeeId: true,
        amountTotal: true,
      },
    });

    const historyByEmployee = new Map<string, number[]>();

    for (const row of historyRows) {
      const current = historyByEmployee.get(row.employeeId) ?? [];
      current.push(toNumber(row.amountTotal));
      historyByEmployee.set(row.employeeId, current);
    }

    return new Map(
      expenses.map((item) => [
        item.id,
        buildStatsSummary(
          "employee",
          historyByEmployee.get(item.employeeId) ?? [],
        ),
      ]),
    );
  }

  static async dispatchProcurements(
    actor: { userId: string; companyId: string },
    procurementIds: string[],
    source: "import" | "manual" = "manual",
  ) {
    const procurements = await prisma.procurementTransaction.findMany({
      where: {
        companyId: actor.companyId,
        id: {
          in: procurementIds,
        },
      },
      include: {
        employee: {
          select: {
            externalRef: true,
          },
        },
      },
    });

    if (!procurements.length) {
      throw new AppError(
        "No procurement transactions found",
        404,
        "PROCUREMENTS_NOT_FOUND",
      );
    }

    const historySummaries = await this.buildProcurementHistorySummaries(
      actor.companyId,
      procurements.map((item) => ({
        id: item.id,
        purchaseId: item.purchaseId,
        vendorName: item.vendorName,
      })),
    );

    const payload = {
      module: "procurement" as const,
      callbackUrl: `${env.BACKEND_BASE_URL}/api/internal/fraud-results/batch`,
      callbackHeaders: {
        "x-internal-api-key": env.INTERNAL_API_KEY,
      },
      records: procurements.map((item) => ({
        id: item.id,
        purchaseId: item.purchaseId,
        purchaseDate: formatDateOnly(item.purchaseDate),
        vendorName: item.vendorName,
        itemDescription: item.itemDescription,
        department: item.department,
        amountTotal: Number(item.amountTotal),
        procurementMethod: item.procurementMethod,
        employeeExternalRef: item.employee?.externalRef ?? null,
        historySummary: historySummaries.get(item.id) ?? null,
      })),
      metadata: {
        source,
        companyId: actor.companyId,
        requestedBy: actor.userId,
      },
    };

    const pythonResponse = await FraudClient.submitBatch(payload);

    await prisma.auditLog.create({
      data: {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "dispatch_procurements_to_fraud_service",
        targetType: "procurement_transaction",
        targetId: null,
        note: "Procurement transactions dispatched to Python fraud service",
        metadata: {
          source,
          procurementIds,
          pythonResponse,
        },
      },
    });

    return {
      module: "procurement",
      totalDispatched: procurements.length,
      callbackUrl: payload.callbackUrl,
      pythonResponse,
    };
  }

  static async dispatchExpenses(
    actor: { userId: string; companyId: string },
    expenseIds: string[],
    source: "import" | "manual" = "manual",
  ) {
    const expenses = await prisma.expense.findMany({
      where: {
        companyId: actor.companyId,
        id: {
          in: expenseIds,
        },
      },
      include: {
        employee: {
          select: {
            externalRef: true,
          },
        },
      },
    });

    if (!expenses.length) {
      throw new AppError("No expenses found", 404, "EXPENSES_NOT_FOUND");
    }

    const historySummaries = await this.buildExpenseHistorySummaries(
      actor.companyId,
      expenses.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
      })),
    );

    const payload = {
      module: "expense" as const,
      callbackUrl: `${env.BACKEND_BASE_URL}/api/internal/fraud-results/batch`,
      callbackHeaders: {
        "x-internal-api-key": env.INTERNAL_API_KEY,
      },
      records: expenses.map((item) => ({
        id: item.id,
        expenseId: item.expenseId,
        expenseDate: formatDateOnly(item.expenseDate),
        department: item.department,
        description: item.description,
        employeeExternalRef: item.employee.externalRef ?? null,
        amountTotal: Number(item.amountTotal),
        category: item.category,
        merchant: item.merchant,
        historySummary: historySummaries.get(item.id) ?? null,
      })),
      metadata: {
        source,
        companyId: actor.companyId,
        requestedBy: actor.userId,
      },
    };

    const pythonResponse = await FraudClient.submitBatch(payload);

    await prisma.auditLog.create({
      data: {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "dispatch_expenses_to_fraud_service",
        targetType: "expense",
        targetId: null,
        note: "Expenses dispatched to Python fraud service",
        metadata: {
          source,
          expenseIds,
          pythonResponse,
        },
      },
    });

    return {
      module: "expense",
      totalDispatched: expenses.length,
      callbackUrl: payload.callbackUrl,
      pythonResponse,
    };
  }

  static async dispatchProcurementForCompany(
    companyId: string,
    procurementId: string,
    actorUserId: string,
  ) {
    return this.dispatchProcurements(
      {
        companyId,
        userId: actorUserId,
      },
      [procurementId],
      "manual",
    );
  }
}
