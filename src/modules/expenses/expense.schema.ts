import { z } from "zod";

const reviewStatusEnum = z.enum([
  "pending",
  "alert",
  "high_alert",
  "auto_approved",
  "approved",
  "rejected",
]);

const expenseCategoryEnum = z.enum([
  "entertainment",
  "transport",
  "office_supply",
  "meals",
  "vehicle",
  "training",
  "others",
]);

export const createExpenseSchema = z.object({
  employeeId: z.string().uuid(),
  expenseId: z.string().max(100).optional().nullable(),
  expenseDate: z.string().datetime(),
  description: z.string().min(1),
  category: expenseCategoryEnum,
  merchant: z.string().max(255).optional().nullable(),
  amountTotal: z.number().nonnegative(),
  department: z.string().max(100).optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const reviewExpenseSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const listExpenseMonitorQuerySchema = z.object({
  status: reviewStatusEnum.optional(),
  group: z.enum(["ml_pending", "needs_review", "reviewed"]).optional(),
  department: z.string().optional(),
  searchEmployee: z.string().optional(),
  searchDescription: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
