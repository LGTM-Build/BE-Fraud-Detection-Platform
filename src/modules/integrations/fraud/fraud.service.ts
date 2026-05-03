import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../core/errors/app-error";

function mapReasonsToFlagsArray(reasons: string[] = []) {
  const flags = new Set<string>();

  for (const reason of reasons) {
    const lower = reason.toLowerCase();

    if (lower.includes("duplicate")) flags.add("Duplicate Invoice");
    if (lower.includes("self approval")) flags.add("Self Approval");
    if (lower.includes("vendor sangat baru")) flags.add("Vendor Baru");
    if (lower.includes("markup")) flags.add("Price Markup");
    if (lower.includes("shell")) flags.add("Shell Company");
    if (lower.includes("inflated")) flags.add("Inflated Amount");
    if (lower.includes("weekend")) flags.add("Weekend Claim");
    if (lower.includes("entertainment")) flags.add("Entertainment Abuse");
    if (lower.includes("split")) flags.add("Split Transaction");
  }

  return [...flags];
}

function riskLevelToStatus(
  riskLevel?: "HIGH" | "MEDIUM" | "LOW" | "SAFE",
): "pending" | "alert" | "high_alert" | "auto_approved" {
  switch (riskLevel) {
    case "HIGH":
      return "high_alert";
    case "MEDIUM":
      return "alert";
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
    procurementId?: string;
    expenseId?: string;
    purchaseId?: string;
    expenseCode?: string;
    transactionType?: "procurement" | "expense";
    scores?: Record<string, number>;
    riskLevel?: "HIGH" | "MEDIUM" | "LOW" | "SAFE";
    predictedFraud?: boolean;
    reasons?: string[];
  }) {
    const fraudScore =
      input.scores?.fraudScore ?? input.scores?.ensemble ?? null;

    const flags = mapReasonsToFlagsArray(input.reasons ?? []);
    const aiExplanation = input.reasons?.join(". ") ?? null;
    const mappedStatus = riskLevelToStatus(input.riskLevel);

    if (input.transactionType === "expense") {
      let expense = null;

      if (input.expenseId) {
        expense = await prisma.expense.findUnique({
          where: { id: input.expenseId },
        });
      }

      if (!expense) {
        throw new AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
      }

      const result = await prisma.fraudAnalysisResult.create({
        data: {
          companyId: expense.companyId,
          expenseId: expense.id,
          analysisType: input.analysisType,
          status: "completed",
          isFraud: input.predictedFraud ?? null,
          fraudScore,
          flags,
          aiExplanation,
          features: {
            reasons: input.reasons,
            riskLevel: input.riskLevel,
          },
          rawResponse: input,
          completedAt: input.generatedAt
            ? new Date(input.generatedAt)
            : new Date(),
        },
      });

      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          status: mappedStatus,
          fraudScore,
          flags,
          aiExplanation,
        },
      });

      return result;
    }

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
      throw new AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
    }

    const result = await prisma.fraudAnalysisResult.create({
      data: {
        companyId: procurement.companyId,
        procurementId: procurement.id,
        analysisType: input.analysisType,
        status: "completed",
        isFraud: input.predictedFraud ?? null,
        fraudScore,
        flags,
        aiExplanation,
        features: {
          reasons: input.reasons,
          riskLevel: input.riskLevel,
        },
        rawResponse: input,
        completedAt: input.generatedAt
          ? new Date(input.generatedAt)
          : new Date(),
      },
    });

    await prisma.procurementTransaction.update({
      where: { id: procurement.id },
      data: {
        status: mappedStatus,
        fraudScore,
        flags,
        aiExplanation,
      },
    });

    return result;
  }
}
