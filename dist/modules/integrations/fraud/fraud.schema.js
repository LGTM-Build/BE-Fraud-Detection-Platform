"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertFraudResultsBatchSchema = exports.insertFraudResultSchema = void 0;
const zod_1 = require("zod");
const scoreObjectSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.number());
const riskLevelSchema = zod_1.z.enum(["HIGH", "MEDIUM", "LOW", "SAFE"]);
const callbackResultSchema = zod_1.z.object({
    module: zod_1.z.enum(["procurement", "expense"]).optional(),
    id: zod_1.z.string().uuid().optional(),
    procurementId: zod_1.z.string().uuid().optional(),
    purchaseId: zod_1.z.string().min(1).optional(),
    expenseDbId: zod_1.z.string().uuid().optional(),
    expenseId: zod_1.z.string().min(1).optional(),
    scores: scoreObjectSchema.optional(),
    fraudScore: zod_1.z.number().optional(),
    riskLevel: riskLevelSchema.optional(),
    predictedFraud: zod_1.z.boolean().optional(),
    reasons: zod_1.z.array(zod_1.z.string()).optional(),
    aiExplanation: zod_1.z.string().optional(),
    raw: zod_1.z.any().optional(),
});
exports.insertFraudResultSchema = callbackResultSchema;
exports.insertFraudResultsBatchSchema = zod_1.z.object({
    module: zod_1.z.enum(["procurement", "expense"]).optional(),
    generatedAt: zod_1.z.string().datetime().optional(),
    results: zod_1.z.array(callbackResultSchema).optional(),
    samplePredictions: zod_1.z.array(callbackResultSchema).optional(),
});
