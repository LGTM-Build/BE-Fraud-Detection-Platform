import axios from "axios";
import { env } from "../../../config/env";
import { AppError } from "../../../core/errors/app-error";

export type ProcurementFraudDispatchPayload = {
  jobContext: {
    jobId: string | null;
    requestedAt: string;
    callbackMode: "single" | "batch";
    callbackUrl: string;
    callbackHeaders: {
      "x-internal-api-key": string;
    };
  };
  analysisContext: {
    analysisType: "supervised" | "anomaly";
    entityType: "procurement_transaction";
    sourceSystem: "node_backend";
    modelPreference: "auto" | "supervised" | "anomaly";
  };
  transaction: {
    procurementId: string;
    purchaseId: string | null;
    purchaseDate: string;
    amountTotal: number;
    unitPrice: number | null;
    quantity: number | null;
    itemDescription: string | null;
    itemId: string | null;
    department: string | null;
    employeeId: string | null;
    approvalDate: string | null;
    status: string;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    location: string | null;
    contractId: string | null;
    contractDate: string | null;
    paymentDate: string | null;
  };
  vendor: {
    vendorId: string;
    vendorName: string;
    vendorRegistrationDate: string | null;
    vendorBankAccount: string | null;
    vendorAddress: string | null;
    vendorContact: string | null;
  };
  metadata: {
    companyId: string;
    createdBy: string;
    dispatchReason:
      | "create_procurement"
      | "update_procurement"
      | "manual_dispatch";
  };
};

export class FraudClient {
  static async submitProcurement(payload: ProcurementFraudDispatchPayload) {
    try {
      const response = await axios.post(
        `${env.PYTHON_FRAUD_API_URL}/predict/procurement`,
        payload,
        {
          timeout: env.PYTHON_FRAUD_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.PYTHON_FRAUD_API_KEY,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new AppError(
          `Python fraud API error: ${error.response.status}`,
          502,
          "PYTHON_FRAUD_API_ERROR",
        );
      }

      if (error.code === "ECONNABORTED") {
        throw new AppError(
          "Python fraud API timeout",
          504,
          "PYTHON_FRAUD_API_TIMEOUT",
        );
      }

      throw new AppError(
        "Failed to connect to Python fraud API",
        502,
        "PYTHON_FRAUD_API_UNAVAILABLE",
      );
    }
  }
}
