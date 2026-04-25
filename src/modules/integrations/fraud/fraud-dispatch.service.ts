import { env } from "../../../config/env";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../core/errors/app-error";
import { FraudClient, ProcurementFraudDispatchPayload } from "./fraud.client";

type DispatchReason =
  | "create_procurement"
  | "update_procurement"
  | "manual_dispatch";

function formatDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split("T")[0];
}

export class FraudDispatchService {
  private static buildPayload(
    procurement: {
      id: string;
      companyId: string;
      createdBy: string;
      purchaseId: string | null;
      purchaseDate: Date;
      amountTotal: unknown;
      unitPrice: unknown;
      quantity: unknown;
      itemDescription: string | null;
      itemId: string | null;
      department: string | null;
      approvalDate: Date | null;
      status: string;
      invoiceNumber: string | null;
      invoiceDate: Date | null;
      location: string | null;
      contractId: string | null;
      contractDate: Date | null;
      paymentDate: Date | null;
      vendor: {
        id: string;
        vendorName: string;
        vendorRegistrationDate: Date | null;
        vendorBankAccount: string | null;
        vendorAddress: string | null;
        vendorContact: string | null;
      };
      employee: {
        id: string;
        externalRef: string | null;
      } | null;
    },
    dispatchReason: DispatchReason,
    analysisType: "supervised" | "anomaly" = "supervised",
    callbackMode: "single" | "batch" = "single",
  ): ProcurementFraudDispatchPayload {
    const callbackPath =
      callbackMode === "single"
        ? "/api/internal/fraud-results"
        : "/api/internal/fraud-results/batch";

    return {
      jobContext: {
        jobId: null,
        requestedAt: new Date().toISOString(),
        callbackMode,
        callbackUrl: `${env.BACKEND_BASE_URL}${callbackPath}`,
        callbackHeaders: {
          "x-internal-api-key": env.INTERNAL_API_KEY,
        },
      },
      analysisContext: {
        analysisType,
        entityType: "procurement_transaction",
        sourceSystem: "node_backend",
        modelPreference: "auto",
      },
      transaction: {
        procurementId: procurement.id,
        purchaseId: procurement.purchaseId ?? null,
        purchaseDate: formatDateOnly(procurement.purchaseDate)!,
        amountTotal: Number(procurement.amountTotal),
        unitPrice:
          procurement.unitPrice !== null && procurement.unitPrice !== undefined
            ? Number(procurement.unitPrice)
            : null,
        quantity:
          procurement.quantity !== null && procurement.quantity !== undefined
            ? Number(procurement.quantity)
            : null,
        itemDescription: procurement.itemDescription ?? null,
        itemId: procurement.itemId ?? null,
        department: procurement.department ?? null,
        employeeId:
          procurement.employee?.externalRef ?? procurement.employee?.id ?? null,
        approvalDate: formatDateOnly(procurement.approvalDate),
        status: procurement.status,
        invoiceNumber: procurement.invoiceNumber ?? null,
        invoiceDate: formatDateOnly(procurement.invoiceDate),
        location: procurement.location ?? null,
        contractId: procurement.contractId ?? null,
        contractDate: formatDateOnly(procurement.contractDate),
        paymentDate: formatDateOnly(procurement.paymentDate),
      },
      vendor: {
        vendorId: procurement.vendor.id,
        vendorName: procurement.vendor.vendorName,
        vendorRegistrationDate: formatDateOnly(
          procurement.vendor.vendorRegistrationDate,
        ),
        vendorBankAccount: procurement.vendor.vendorBankAccount ?? null,
        vendorAddress: procurement.vendor.vendorAddress ?? null,
        vendorContact: procurement.vendor.vendorContact ?? null,
      },
      metadata: {
        companyId: procurement.companyId,
        createdBy: procurement.createdBy,
        dispatchReason,
      },
    };
  }

  static async dispatchProcurement(
    procurementId: string,
    dispatchReason: DispatchReason = "manual_dispatch",
    analysisType: "supervised" | "anomaly" = "supervised",
  ) {
    const procurement = await prisma.procurementTransaction.findUnique({
      where: { id: procurementId },
      include: {
        vendor: true,
        employee: true,
      },
    });

    if (!procurement) {
      throw new AppError(
        "Procurement transaction not found",
        404,
        "PROCUREMENT_NOT_FOUND",
      );
    }

    const payload = this.buildPayload(
      procurement,
      dispatchReason,
      analysisType,
    );

    const pythonResponse = await FraudClient.submitProcurement(payload);

    await prisma.auditLog.create({
      data: {
        companyId: procurement.companyId,
        userId: procurement.createdBy,
        action: "dispatch_procurement_to_fraud_service",
        targetType: "procurement_transaction",
        targetId: procurement.id,
        note: "Procurement transaction dispatched to Python fraud service",
        metadata: {
          dispatchReason,
          analysisType,
          payload,
          pythonResponse,
        },
      },
    });

    return {
      procurementId: procurement.id,
      purchaseId: procurement.purchaseId,
      dispatchReason,
      analysisType,
      callbackUrl: payload.jobContext.callbackUrl,
      pythonResponse,
    };
  }

  static async dispatchProcurementForCompany(
    companyId: string,
    procurementId: string,
    actorUserId: string,
    dispatchReason: DispatchReason = "manual_dispatch",
    analysisType: "supervised" | "anomaly" = "supervised",
  ) {
    const procurement = await prisma.procurementTransaction.findFirst({
      where: {
        id: procurementId,
        companyId,
      },
      include: {
        vendor: true,
        employee: true,
      },
    });

    if (!procurement) {
      throw new AppError(
        "Procurement transaction not found",
        404,
        "PROCUREMENT_NOT_FOUND",
      );
    }

    const payload = this.buildPayload(
      procurement,
      dispatchReason,
      analysisType,
    );

    const pythonResponse = await FraudClient.submitProcurement(payload);

    await prisma.auditLog.create({
      data: {
        companyId: procurement.companyId,
        userId: actorUserId,
        action: "dispatch_procurement_to_fraud_service",
        targetType: "procurement_transaction",
        targetId: procurement.id,
        note: "Procurement transaction manually dispatched to Python fraud service",
        metadata: {
          dispatchReason,
          analysisType,
          payload,
          pythonResponse,
        },
      },
    });

    return {
      procurementId: procurement.id,
      purchaseId: procurement.purchaseId,
      dispatchReason,
      analysisType,
      callbackUrl: payload.jobContext.callbackUrl,
      pythonResponse,
    };
  }
}
