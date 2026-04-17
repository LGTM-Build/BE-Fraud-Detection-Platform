import { z } from "zod";

export const listAuditLogQuerySchema = z.object({
  action: z.string().optional(),
  targetType: z.string().optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
