import { z } from "zod";

export const vendorStatusSchema = z.enum(["active", "inactive", "blacklisted"]);

export const createVendorSchema = z.object({
  vendorName: z.string().min(1).max(255),
  metadata: z.any().optional(),
  status: vendorStatusSchema.optional(),
});

export const updateVendorSchema = z.object({
  vendorName: z.string().min(1).max(255).optional(),
  metadata: z.any().optional(),
  status: vendorStatusSchema.optional(),
});

export const updateVendorStatusSchema = z.object({
  status: vendorStatusSchema,
});
