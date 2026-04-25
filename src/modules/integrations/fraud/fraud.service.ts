import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../core/errors/app-error";

type PredictionItem = {
  purchaseId: string;
  employeeId?: string;
  department?: string;
  transactionType: string;
  amountTotal?: number;
  category?: string;
  purchaseDate?: string;
  vendorName?: string;
  scores?: Record<string, number>;
  riskLevel?: "HIGH" | "MEDIUM" | "LOW" | "SAFE";
  predictedFraud?: boolean;
  actualFraud?: boolean;
  correct?: boolean;
  reasons?: string[];
};

function mapReasonsToFlags(reasons: string[] = []) {
  const flags: Record<string, number> = {
    duplicate_invoice: 0,
    self_approval: 0,
    bypass_tender: 0,
    shell_company: 0,
    new_vendor: 0,
    price_markup: 0,
    amount_outlier: 0,
    approval_before_purchase: 0,
    payment_before_invoice: 0,
    unknown_employee: 0,
    high_frequency: 0,
  };

  for (const reason of reasons) {
    const lower = reason.toLowerCase();

    if (lower.includes("vendor sangat baru")) flags.new_vendor = 1;
    if (lower.includes("approval date mendahului purchase date"))
      flags.approval_before_purchase = 1;
    if (lower.includes("payment date mendahului invoice date"))
      flags.payment_before_invoice = 1;
    if (lower.includes("invoice duplikat")) flags.duplicate_invoice = 1;
    if (lower.includes("employee id tidak dikenali"))
      flags.unknown_employee = 1;
    if (lower.includes("nominal") && lower.includes("median kategori"))
      flags.amount_outlier = 1;
    if (lower.includes("transaksi burst")) flags.high_frequency = 1;
  }

  return flags;
}

function riskLevelToReviewStatus(riskLevel?: string) {
  switch (riskLevel) {
    case "HIGH":
      return "high_alert";
    case "MEDIUM":
      return "pending_review";
    case "LOW":
      return "pending";
    case "SAFE":
      return "auto_approved";
    default:
      return "pending";
  }
}

export class FraudIntegrationService {
  static async insertSingle(input: {
    analysisType: "supervised" | "anomaly";
    generatedAt?: string;
    modelMeta?: Record<string, any>;
    procurementId?: string;
    purchaseId?: string;
    transactionType?: string;
    employeeId?: string;
    department?: string;
    amountTotal?: number;
    category?: string;
    purchaseDate?: string;
    vendorName?: string;
    scores?: Record<string, number>;
    riskLevel?: "HIGH" | "MEDIUM" | "LOW" | "SAFE";
    predictedFraud?: boolean;
    actualFraud?: boolean;
    correct?: boolean;
    reasons?: string[];
  }) {
    let procurement = null;

    if (input.procurementId) {
      procurement = await prisma.procurementTransaction.findUnique({
        where: { id: input.procurementId },
      });
    } else if (input.purchaseId) {
      procurement = await prisma.procurementTransaction.findFirst({
        where: { purchaseId: input.purchaseId },
      });
    }

    if (!procurement) {
      throw new AppError(
        "Procurement transaction not found",
        404,
        "PROCUREMENT_NOT_FOUND",
      );
    }

    const fraudScore =
      input.scores?.fraudScore ?? input.scores?.ensemble ?? null;

    const flags = mapReasonsToFlags(input.reasons ?? []);

    const inserted = await prisma.fraudAnalysisResult.create({
      data: {
        companyId: procurement.companyId,
        procurementId: procurement.id,
        analysisType: input.analysisType,
        status: "completed",
        isFraud: input.predictedFraud ?? null,
        fraudScore,
        flags,
        features: {
          purchaseId: input.purchaseId,
          employeeId: input.employeeId,
          department: input.department,
          amountTotal: input.amountTotal,
          category: input.category,
          purchaseDate: input.purchaseDate,
          vendorName: input.vendorName,
          scores: input.scores,
          reasons: input.reasons,
          riskLevel: input.riskLevel,
        },
        rawResponse: {
          generatedAt: input.generatedAt,
          modelMeta: input.modelMeta,
          prediction: {
            procurementId: input.procurementId,
            purchaseId: input.purchaseId,
            transactionType: input.transactionType,
            employeeId: input.employeeId,
            department: input.department,
            amountTotal: input.amountTotal,
            category: input.category,
            purchaseDate: input.purchaseDate,
            vendorName: input.vendorName,
            scores: input.scores,
            riskLevel: input.riskLevel,
            predictedFraud: input.predictedFraud,
            actualFraud: input.actualFraud,
            correct: input.correct,
            reasons: input.reasons,
          },
        },
        completedAt: input.generatedAt
          ? new Date(input.generatedAt)
          : new Date(),
      },
    });

    const nextReviewStatus = riskLevelToReviewStatus(input.riskLevel);

    await prisma.procurementTransaction.update({
      where: { id: procurement.id },
      data: {
        status: nextReviewStatus as any,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: procurement.companyId,
        userId: procurement.createdBy,
        action: "insert_fraud_result",
        targetType: "procurement_transaction",
        targetId: procurement.id,
        note: `Fraud result inserted from ${input.analysisType}`,
        metadata: {
          purchaseId: input.purchaseId,
          fraudAnalysisResultId: inserted.id,
          fraudScore,
          riskLevel: input.riskLevel,
          predictedFraud: input.predictedFraud,
        },
      },
    });

    return {
      purchaseId: input.purchaseId ?? null,
      procurementId: procurement.id,
      fraudAnalysisResultId: inserted.id,
      status: "inserted",
    };
  }

  static async insertBatch(input: {
    analysisType: "supervised" | "anomaly";
    generatedAt?: string;
    modelMeta?: Record<string, any>;
    samplePredictions: Array<{
      purchaseId: string;
      employeeId?: string;
      department?: string;
      transactionType: string;
      amountTotal?: number;
      category?: string;
      purchaseDate?: string;
      vendorName?: string;
      scores?: Record<string, number>;
      riskLevel?: "HIGH" | "MEDIUM" | "LOW" | "SAFE";
      predictedFraud?: boolean;
      actualFraud?: boolean;
      correct?: boolean;
      reasons?: string[];
    }>;
  }) {
    const procurementItems = input.samplePredictions.filter(
      (item) => item.transactionType?.toLowerCase() === "procurement",
    );

    const results: Array<{
      purchaseId: string;
      status: "inserted" | "skipped_not_found";
      procurementId?: string;
      fraudAnalysisResultId?: string;
    }> = [];

    for (const item of procurementItems) {
      const procurement = await prisma.procurementTransaction.findFirst({
        where: {
          purchaseId: item.purchaseId,
        },
      });

      if (!procurement) {
        results.push({
          purchaseId: item.purchaseId,
          status: "skipped_not_found",
        });
        continue;
      }

      const fraudScore =
        item.scores?.fraudScore ?? item.scores?.ensemble ?? null;

      const flags = mapReasonsToFlags(item.reasons ?? []);

      const inserted = await prisma.fraudAnalysisResult.create({
        data: {
          companyId: procurement.companyId,
          procurementId: procurement.id,
          analysisType: input.analysisType,
          status: "completed",
          isFraud: item.predictedFraud ?? null,
          fraudScore,
          flags,
          features: {
            purchaseId: item.purchaseId,
            employeeId: item.employeeId,
            department: item.department,
            amountTotal: item.amountTotal,
            category: item.category,
            purchaseDate: item.purchaseDate,
            vendorName: item.vendorName,
            scores: item.scores,
            reasons: item.reasons,
            riskLevel: item.riskLevel,
          },
          rawResponse: {
            generatedAt: input.generatedAt,
            modelMeta: input.modelMeta,
            prediction: item,
          },
          completedAt: input.generatedAt
            ? new Date(input.generatedAt)
            : new Date(),
        },
      });

      const nextReviewStatus = riskLevelToReviewStatus(item.riskLevel);

      await prisma.procurementTransaction.update({
        where: { id: procurement.id },
        data: {
          status: nextReviewStatus as any,
        },
      });

      await prisma.auditLog.create({
        data: {
          companyId: procurement.companyId,
          userId: procurement.createdBy,
          action: "insert_fraud_result",
          targetType: "procurement_transaction",
          targetId: procurement.id,
          note: `Fraud result inserted from ${input.analysisType}`,
          metadata: {
            purchaseId: item.purchaseId,
            fraudAnalysisResultId: inserted.id,
            fraudScore,
            riskLevel: item.riskLevel,
            predictedFraud: item.predictedFraud,
          },
        },
      });

      results.push({
        purchaseId: item.purchaseId,
        status: "inserted",
        procurementId: procurement.id,
        fraudAnalysisResultId: inserted.id,
      });
    }

    return {
      totalReceived: input.samplePredictions.length,
      totalProcurementItems: procurementItems.length,
      insertedCount: results.filter((x) => x.status === "inserted").length,
      skippedCount: results.filter((x) => x.status === "skipped_not_found")
        .length,
      results,
    };
  }
}
