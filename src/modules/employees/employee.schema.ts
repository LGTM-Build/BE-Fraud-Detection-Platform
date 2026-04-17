import { z } from "zod";

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1).max(255),
  phoneNumber: z.string().max(50),
  department: z.string().max(100).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  avgMonthlyExpense: z.number().nonnegative().optional().nullable(),
  externalRef: z.string().max(100).optional().nullable(),
  metadata: z.any().optional(),
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phoneNumber: z.string().max(50).optional().default("undefined"),
  department: z.string().max(100).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  avgMonthlyExpense: z.number().nonnegative().optional().nullable(),
  externalRef: z.string().max(100).optional().nullable(),
  metadata: z.any().optional(),
});
