import { z } from "zod";

function nullableTrimmedString(max: number) {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(max).optional().nullable());
}

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1).max(255),
  phoneNumber: z.string().max(50),
  department: nullableTrimmedString(100),
  position: nullableTrimmedString(100),
  avgMonthlyExpense: z.number().nonnegative().optional().nullable(),
  externalRef: nullableTrimmedString(100),
  metadata: z.any().optional(),
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phoneNumber: z.string().max(50).optional().default("undefined"),
  department: nullableTrimmedString(100),
  position: nullableTrimmedString(100),
  avgMonthlyExpense: z.number().nonnegative().optional().nullable(),
  externalRef: nullableTrimmedString(100),
  metadata: z.any().optional(),
});
