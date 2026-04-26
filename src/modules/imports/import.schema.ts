import { z } from "zod";

export const importProcurementQuerySchema = z.object({
  dispatchFraud: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});
