import { z } from "zod";

export const importQuerySchema = z.object({
  dispatchMl: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});
