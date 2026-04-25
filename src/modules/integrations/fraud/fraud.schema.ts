import { z } from "zod";

const scoreObjectSchema = z.record(z.string(), z.number());

const predictionItemSchema = z.object({
  purchaseId: z.string().min(1),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  transactionType: z.string(),
  amountTotal: z.number().optional(),
  category: z.string().optional(),
  purchaseDate: z.string().optional(),
  vendorName: z.string().optional(),
  scores: scoreObjectSchema.optional(),
  riskLevel: z.enum(["HIGH", "MEDIUM", "LOW", "SAFE"]).optional(),
  predictedFraud: z.boolean().optional(),
  actualFraud: z.boolean().optional(),
  correct: z.boolean().optional(),
  reasons: z.array(z.string()).optional(),
});

export const insertFraudResultsBatchSchema = z.object({
  analysisType: z.enum(["supervised", "anomaly"]),
  generatedAt: z.string().datetime().optional(),
  modelMeta: z.record(z.string(), z.any()).optional(),
  samplePredictions: z.array(
    z.object({
      purchaseId: z.string().min(1),
      employeeId: z.string().optional(),
      department: z.string().optional(),
      transactionType: z.string(),
      amountTotal: z.number().optional(),
      category: z.string().optional(),
      purchaseDate: z.string().optional(),
      vendorName: z.string().optional(),
      scores: scoreObjectSchema.optional(),
      riskLevel: z.enum(["HIGH", "MEDIUM", "LOW", "SAFE"]).optional(),
      predictedFraud: z.boolean().optional(),
      actualFraud: z.boolean().optional(),
      correct: z.boolean().optional(),
      reasons: z.array(z.string()).optional(),
    }),
  ),
});
export const insertFraudResultSchema = z.object({
  analysisType: z.enum(["supervised", "anomaly"]),
  generatedAt: z.string().datetime().optional(),
  modelMeta: z.record(z.string(), z.any()).optional(),

  procurementId: z.string().uuid().optional(),
  purchaseId: z.string().min(1).optional(),

  transactionType: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  amountTotal: z.number().optional(),
  category: z.string().optional(),
  purchaseDate: z.string().optional(),
  vendorName: z.string().optional(),

  scores: scoreObjectSchema.optional(),
  riskLevel: z.enum(["HIGH", "MEDIUM", "LOW", "SAFE"]).optional(),
  predictedFraud: z.boolean().optional(),
  actualFraud: z.boolean().optional(),
  correct: z.boolean().optional(),
  reasons: z.array(z.string()).optional(),
});
