import { env } from "../../../config/env";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../core/errors/app-error";
import { FraudClient } from "./fraud.client";

function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

export class FraudDispatchService {
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
