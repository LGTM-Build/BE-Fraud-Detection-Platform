import { z } from "zod";

const scoreObjectSchema = z.record(z.string(), z.number());

const riskLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW", "SAFE"]);

const callbackResultSchema = z.object({
  module: z.enum(["procurement", "expense"]).optional(),

  id: z.string().uuid().optional(),

  procurementId: z.string().uuid().optional(),
  purchaseId: z.string().min(1).optional(),

  expenseDbId: z.string().uuid().optional(),
  expenseId: z.string().min(1).optional(),

  scores: scoreObjectSchema.optional(),
  fraudScore: z.number().optional(),

  riskLevel: riskLevelSchema.optional(),
  predictedFraud: z.boolean().optional(),

  reasons: z.array(z.string()).optional(),
  aiExplanation: z.string().optional(),

  raw: z.any().optional(),
});

export const insertFraudResultSchema = callbackResultSchema;

export const insertFraudResultsBatchSchema = z.object({
  module: z.enum(["procurement", "expense"]).optional(),
  generatedAt: z.string().datetime().optional(),
  results: z.array(callbackResultSchema).optional(),
  samplePredictions: z.array(callbackResultSchema).optional(),
});
