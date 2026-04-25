import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../core/errors/app-error";
import { FraudClient } from "./fraud.client";

export class FraudDispatchService {
  static async dispatchProcurement(procurementId: string) {
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

    const payload = {
      procurementId: procurement.id,
      purchaseId: procurement.purchaseId ?? null,
      purchaseDate: procurement.purchaseDate.toISOString().split("T")[0],
      vendorName: procurement.vendor.vendorName,
      amountTotal: Number(procurement.amountTotal),
      unitPrice: procurement.unitPrice ? Number(procurement.unitPrice) : null,
      quantity: procurement.quantity ? Number(procurement.quantity) : null,
      itemDescription: procurement.itemDescription ?? null,
      department: procurement.department ?? null,
      employeeId:
        procurement.employee?.externalRef ?? procurement.employee?.id ?? null,
      approvalDate: procurement.approvalDate
        ? procurement.approvalDate.toISOString().split("T")[0]
        : null,
      status: procurement.status,
      invoiceNumber: procurement.invoiceNumber ?? null,
      invoiceDate: procurement.invoiceDate
        ? procurement.invoiceDate.toISOString().split("T")[0]
        : null,
      location: procurement.location ?? null,
      vendorRegistrationDate: procurement.vendor.vendorRegistrationDate
        ? procurement.vendor.vendorRegistrationDate.toISOString().split("T")[0]
        : null,
      vendorBankAccount: procurement.vendor.vendorBankAccount ?? null,
      vendorAddress: procurement.vendor.vendorAddress ?? null,
      vendorContact: procurement.vendor.vendorContact ?? null,
      contractId: procurement.contractId ?? null,
      contractDate: procurement.contractDate
        ? procurement.contractDate.toISOString().split("T")[0]
        : null,
      paymentDate: procurement.paymentDate
        ? procurement.paymentDate.toISOString().split("T")[0]
        : null,
    };

    const response = await FraudClient.submitProcurement(payload);

    await prisma.auditLog.create({
      data: {
        companyId: procurement.companyId,
        userId: procurement.createdBy,
        action: "dispatch_procurement_to_fraud_service",
        targetType: "procurement_transaction",
        targetId: procurement.id,
        note: "Procurement transaction dispatched to Python fraud service",
        metadata: {
          payload,
          pythonResponse: response,
        },
      },
    });

    return {
      procurementId: procurement.id,
      payload,
      pythonResponse: response,
    };
  }
}
