import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../core/errors/app-error";

const DEFAULT_ANALYSIS_TYPE = "anomaly" as const;

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function mapReasonsToFlagsArray(reasons: string[] = []) {
  const flags = new Set<string>();

  for (const reason of reasons) {
    const lower = normalizeText(reason);

    if (
      lower.includes("duplicate") ||
      lower.includes("duplikat") ||
      lower.includes("invoice muncul")
    ) {
      flags.add("Duplicate Invoice");
    }

    if (
      lower.includes("self approval") ||
      lower.includes("persetujuan sendiri")
    ) {
      flags.add("Self Approval");
    }

    if (
      lower.includes("vendor") ||
      lower.includes("vendor baru") ||
      lower.includes("vendor sangat baru")
    ) {
      flags.add("Vendor Risk");
    }

    if (lower.includes("markup")) {
      flags.add("Price Markup");
    }

    if (
      lower.includes("shell") ||
      lower.includes("perusahaan cangkang")
    ) {
      flags.add("Shell Company");
    }

    if (
      lower.includes("inflated") ||
      lower.includes("nominal jauh di atas") ||
      lower.includes("di atas median") ||
      lower.includes("abnormal amount")
    ) {
      flags.add("Inflated Amount");
    }

    if (
      lower.includes("weekend") ||
      lower.includes("akhir pekan")
    ) {
      flags.add("Weekend Claim");
    }

    if (
      lower.includes("entertainment") ||
      lower.includes("hiburan")
    ) {
      flags.add("Entertainment Abuse");
    }

    if (
      lower.includes("split") ||
      lower.includes("burst") ||
      lower.includes("dipecah")
    ) {
      flags.add("Split Transaction");
    }
  }

  return [...flags];
}

function extractRawObject(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  return raw as Record<string, unknown>;
}

function extractHistorySummary(raw: unknown) {
  const rawObject = extractRawObject(raw);
  const sourceRecord = extractRawObject(rawObject?.sourceRecord);
  const historySummary = sourceRecord?.historySummary;

  if (!historySummary || typeof historySummary !== "object") {
    return null;
  }

  return historySummary;
}

function buildFeatureSnapshot(input: CallbackItem) {
  return {
    reasons: input.reasons ?? [],
    riskLevel: input.riskLevel ?? null,
    historySummary: extractHistorySummary(input.raw),
  };
}

function mergeFlags(...collections: Array<string[] | null | undefined>) {
  const merged = new Set<string>();

  for (const collection of collections) {
    if (!collection) continue;

    for (const item of collection) {
      if (!item) continue;
      merged.add(String(item));
    }
  }

  return [...merged];
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

function getFraudScore(input: {
  scores?: Record<string, number>;
  fraudScore?: number;
}) {
  return (
    input.fraudScore ??
    input.scores?.fraudScore ??
    input.scores?.ensemble ??
    null
  );
}

function keepHigherFraudScore(
  currentScore: number | null,
  nextScore: number | null,
) {
  if (currentScore === null || currentScore === undefined) return nextScore;
  if (nextScore === null || nextScore === undefined) return currentScore;
  return Math.max(currentScore, nextScore);
}

function statusSeverity(
  status: "pending" | "alert" | "high_alert" | "auto_approved",
) {
  const map = {
    pending: 1,
    alert: 2,
    high_alert: 3,
    auto_approved: 0,
  } as const;

  return map[status];
}

function keepHigherRiskStatus(
  currentStatus:
    | "pending"
    | "alert"
    | "high_alert"
    | "auto_approved"
    | "approved"
    | "rejected",
  nextStatus: "pending" | "alert" | "high_alert" | "auto_approved",
) {
  if (currentStatus === "approved" || currentStatus === "rejected") {
    return currentStatus;
  }

  return statusSeverity(currentStatus) >= statusSeverity(nextStatus)
    ? currentStatus
    : nextStatus;
}

type CallbackItem = {
  module?: "procurement" | "expense";

  id?: string;

  procurementId?: string;
  purchaseId?: string;

  expenseDbId?: string;
  expenseId?: string;

  scores?: Record<string, number>;
  fraudScore?: number;

  riskLevel?: "HIGH" | "MEDIUM" | "LOW" | "SAFE";
  predictedFraud?: boolean;

  reasons?: string[];
  aiExplanation?: string;

  raw?: unknown;
};

export class FraudIntegrationService {
  static async insertSingle(input: CallbackItem & { generatedAt?: string }) {
    const module =
      input.module ??
      (input.expenseId || input.expenseDbId ? "expense" : "procurement");

    const fraudScore = getFraudScore(input);
    const flags = mapReasonsToFlagsArray(input.reasons ?? []);
    const aiExplanation =
      input.aiExplanation ?? input.reasons?.join(". ") ?? null;
    const mappedStatus = riskLevelToStatus(input.riskLevel);
    const completedAt = input.generatedAt
      ? new Date(input.generatedAt)
      : new Date();

    if (module === "expense") {
      const expense = await prisma.expense.findFirst({
        where: {
          OR: [
            ...(input.id ? [{ id: input.id }] : []),
            ...(input.expenseDbId ? [{ id: input.expenseDbId }] : []),
            ...(input.expenseId ? [{ expenseId: input.expenseId }] : []),
          ],
        },
      });

      if (!expense) {
        throw new AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
      }

      const result = await prisma.fraudAnalysisResult.create({
        data: {
          companyId: expense.companyId,
          expenseId: expense.id,
          analysisType: DEFAULT_ANALYSIS_TYPE,
          status: "completed",
          isFraud: input.predictedFraud ?? null,
          fraudScore,
          flags,
          aiExplanation,
          features: buildFeatureSnapshot(input),
          rawResponse: input.raw ?? input,
          completedAt,
        },
      });

      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          status: keepHigherRiskStatus(expense.status, mappedStatus),
          fraudScore: keepHigherFraudScore(expense.fraudScore, fraudScore),
          flags: mergeFlags(expense.flags as string[] | undefined, flags),
          aiExplanation,
        },
      });

      return result;
    }

    const procurement = await prisma.procurementTransaction.findFirst({
      where: {
        OR: [
          ...(input.id ? [{ id: input.id }] : []),
          ...(input.procurementId ? [{ id: input.procurementId }] : []),
          ...(input.purchaseId ? [{ purchaseId: input.purchaseId }] : []),
        ],
      },
    });

    if (!procurement) {
      throw new AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
    }

    const result = await prisma.fraudAnalysisResult.create({
      data: {
        companyId: procurement.companyId,
        procurementId: procurement.id,
        analysisType: DEFAULT_ANALYSIS_TYPE,
        status: "completed",
        isFraud: input.predictedFraud ?? null,
        fraudScore,
        flags,
        aiExplanation,
        features: buildFeatureSnapshot(input),
        rawResponse: input.raw ?? input,
        completedAt,
      },
    });

    await prisma.procurementTransaction.update({
      where: { id: procurement.id },
      data: {
        status: keepHigherRiskStatus(procurement.status, mappedStatus),
        fraudScore: keepHigherFraudScore(procurement.fraudScore, fraudScore),
        flags: mergeFlags(procurement.flags as string[] | undefined, flags),
        aiExplanation,
      },
    });

    return result;
  }

  static async insertBatch(input: {
    module?: "procurement" | "expense";
    generatedAt?: string;
    jobId?: string;
    chunkIndex?: number;
    chunkCount?: number;
    isFinalChunk?: boolean;
    historySource?: string;
    results?: CallbackItem[];
    samplePredictions?: CallbackItem[];
  }) {
    const rows = input.results ?? input.samplePredictions ?? [];

    const successes: Array<{
      index: number;
      id: string;
    }> = [];

    const errors: Array<{
      index: number;
      message: string;
    }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      try {
        const result = await this.insertSingle({
          ...row,
          module: row.module ?? input.module,
          generatedAt: input.generatedAt,
        });

        successes.push({
          index,
          id: result.id,
        });
      } catch (error: any) {
        errors.push({
          index,
          message: error.message ?? "Unknown callback error",
        });
      }
    }

    return {
      jobId: input.jobId ?? null,
      chunkIndex: input.chunkIndex ?? null,
      chunkCount: input.chunkCount ?? null,
      isFinalChunk: input.isFinalChunk ?? null,
      historySource: input.historySource ?? null,
      totalRows: rows.length,
      successRows: successes.length,
      failedRows: errors.length,
      successes,
      errors,
    };
  }
}
