import axios from "axios";
import { env } from "../../../config/env";
import { AppError } from "../../../core/errors/app-error";

export type FraudProcurementRecordPayload = {
  id: string;
  purchaseId: string | null;
  purchaseDate: string;
  vendorName: string;
  itemDescription: string;
  department: string | null;
  amountTotal: number;
  procurementMethod: string;
  employeeExternalRef: string | null;
  historySummary?: FraudHistorySummaryPayload | null;
};

export type FraudExpenseRecordPayload = {
  id: string;
  expenseId: string | null;
  expenseDate: string;
  department: string | null;
  description: string;
  employeeExternalRef: string | null;
  amountTotal: number;
  category: string;
  merchant: string | null;
  historySummary?: FraudHistorySummaryPayload | null;
};

export type FraudHistorySummaryPayload = {
  scope: "vendor" | "employee";
  transactionCount: number;
  amountMean: number | null;
  amountMedian: number | null;
  amountStd: number | null;
  duplicateReferenceCount?: number;
  historyReady: boolean;
  source: "backend_db";
};

export type FraudBatchMetadata = {
  source: "import" | "manual";
  companyId: string;
  requestedBy: string;
  historySource?: string;
  callbackMode?: string;
  chunkIndex?: number;
  chunkCount?: number;
};

export type FraudBatchPayload =
  | {
      module: "procurement";
      callbackUrl: string;
      callbackHeaders: {
        "x-internal-api-key": string;
      };
      records: FraudProcurementRecordPayload[];
      metadata: FraudBatchMetadata;
    }
  | {
      module: "expense";
      callbackUrl: string;
      callbackHeaders: {
        "x-internal-api-key": string;
      };
      records: FraudExpenseRecordPayload[];
      metadata: FraudBatchMetadata;
    };

export class FraudClient {
  static async submitBatch(payload: FraudBatchPayload) {
    try {
      const response = await axios.post(
        `${env.PYTHON_FRAUD_API_URL}/predict`,
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
