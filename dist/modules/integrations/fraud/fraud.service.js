"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudIntegrationService = void 0;
const prisma_1 = require("../../../lib/prisma");
const app_error_1 = require("../../../core/errors/app-error");
const DEFAULT_ANALYSIS_TYPE = "supervised";
function mapReasonsToFlagsArray(reasons = []) {
    const flags = new Set();
    for (const reason of reasons) {
        const lower = reason.toLowerCase();
        if (lower.includes("duplicate"))
            flags.add("Duplicate Invoice");
        if (lower.includes("self approval"))
            flags.add("Self Approval");
        if (lower.includes("vendor"))
            flags.add("Vendor Risk");
        if (lower.includes("markup"))
            flags.add("Price Markup");
        if (lower.includes("shell"))
            flags.add("Shell Company");
        if (lower.includes("inflated"))
            flags.add("Inflated Amount");
        if (lower.includes("weekend"))
            flags.add("Weekend Claim");
        if (lower.includes("entertainment"))
            flags.add("Entertainment Abuse");
        if (lower.includes("split"))
            flags.add("Split Transaction");
    }
    return [...flags];
}
function mergeFlags(...collections) {
    const merged = new Set();
    for (const collection of collections) {
        if (!collection)
            continue;
        for (const item of collection) {
            if (!item)
                continue;
            merged.add(String(item));
        }
    }
    return [...merged];
}
function riskLevelToStatus(riskLevel) {
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
function getFraudScore(input) {
    return (input.fraudScore ??
        input.scores?.fraudScore ??
        input.scores?.ensemble ??
        null);
}
function keepHigherFraudScore(currentScore, nextScore) {
    if (currentScore === null || currentScore === undefined)
        return nextScore;
    if (nextScore === null || nextScore === undefined)
        return currentScore;
    return Math.max(currentScore, nextScore);
}
function statusSeverity(status) {
    const map = {
        pending: 1,
        alert: 2,
        high_alert: 3,
        auto_approved: 0,
    };
    return map[status];
}
function keepHigherRiskStatus(currentStatus, nextStatus) {
    if (currentStatus === "approved" || currentStatus === "rejected") {
        return currentStatus;
    }
    return statusSeverity(currentStatus) >= statusSeverity(nextStatus)
        ? currentStatus
        : nextStatus;
}
class FraudIntegrationService {
    static async insertSingle(input) {
        const module = input.module ??
            (input.expenseId || input.expenseDbId ? "expense" : "procurement");
        const fraudScore = getFraudScore(input);
        const flags = mapReasonsToFlagsArray(input.reasons ?? []);
        const aiExplanation = input.aiExplanation ?? input.reasons?.join(". ") ?? null;
        const mappedStatus = riskLevelToStatus(input.riskLevel);
        const completedAt = input.generatedAt
            ? new Date(input.generatedAt)
            : new Date();
        if (module === "expense") {
            const expense = await prisma_1.prisma.expense.findFirst({
                where: {
                    OR: [
                        ...(input.id ? [{ id: input.id }] : []),
                        ...(input.expenseDbId ? [{ id: input.expenseDbId }] : []),
                        ...(input.expenseId ? [{ expenseId: input.expenseId }] : []),
                    ],
                },
            });
            if (!expense) {
                throw new app_error_1.AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
            }
            const result = await prisma_1.prisma.fraudAnalysisResult.create({
                data: {
                    companyId: expense.companyId,
                    expenseId: expense.id,
                    analysisType: DEFAULT_ANALYSIS_TYPE,
                    status: "completed",
                    isFraud: input.predictedFraud ?? null,
                    fraudScore,
                    flags,
                    aiExplanation,
                    features: {
                        reasons: input.reasons ?? [],
                        riskLevel: input.riskLevel ?? null,
                    },
                    rawResponse: input.raw ?? input,
                    completedAt,
                },
            });
            await prisma_1.prisma.expense.update({
                where: { id: expense.id },
                data: {
                    status: keepHigherRiskStatus(expense.status, mappedStatus),
                    fraudScore: keepHigherFraudScore(expense.fraudScore, fraudScore),
                    flags: mergeFlags(expense.flags, flags),
                    aiExplanation,
                },
            });
            return result;
        }
        const procurement = await prisma_1.prisma.procurementTransaction.findFirst({
            where: {
                OR: [
                    ...(input.id ? [{ id: input.id }] : []),
                    ...(input.procurementId ? [{ id: input.procurementId }] : []),
                    ...(input.purchaseId ? [{ purchaseId: input.purchaseId }] : []),
                ],
            },
        });
        if (!procurement) {
            throw new app_error_1.AppError("Procurement not found", 404, "PROCUREMENT_NOT_FOUND");
        }
        const result = await prisma_1.prisma.fraudAnalysisResult.create({
            data: {
                companyId: procurement.companyId,
                procurementId: procurement.id,
                analysisType: DEFAULT_ANALYSIS_TYPE,
                status: "completed",
                isFraud: input.predictedFraud ?? null,
                fraudScore,
                flags,
                aiExplanation,
                features: {
                    reasons: input.reasons ?? [],
                    riskLevel: input.riskLevel ?? null,
                },
                rawResponse: input.raw ?? input,
                completedAt,
            },
        });
        await prisma_1.prisma.procurementTransaction.update({
            where: { id: procurement.id },
            data: {
                status: keepHigherRiskStatus(procurement.status, mappedStatus),
                fraudScore: keepHigherFraudScore(procurement.fraudScore, fraudScore),
                flags: mergeFlags(procurement.flags, flags),
                aiExplanation,
            },
        });
        return result;
    }
    static async insertBatch(input) {
        const rows = input.results ?? input.samplePredictions ?? [];
        const successes = [];
        const errors = [];
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
            }
            catch (error) {
                errors.push({
                    index,
                    message: error.message ?? "Unknown callback error",
                });
            }
        }
        return {
            totalRows: rows.length,
            successRows: successes.length,
            failedRows: errors.length,
            successes,
            errors,
        };
    }
}
exports.FraudIntegrationService = FraudIntegrationService;
