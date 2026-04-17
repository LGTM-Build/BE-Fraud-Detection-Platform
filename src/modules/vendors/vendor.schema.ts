import { z } from "zod";

export const vendorStatusSchema = z.enum(["active", "inactive", "blacklisted"]);

export const createVendorSchema = z.object({
  vendorName: z.string().min(1).max(255),
  vendorRegistrationDate: z.string().datetime().optional().nullable(),
  vendorBankAccount: z.string().max(100).optional().nullable(),
  vendorAddress: z.string().max(255).optional().nullable(),
  vendorContact: z.string().max(255).optional().nullable(),
  externalRef: z.string().max(100).optional().nullable(),
  metadata: z.any().optional(),
  status: vendorStatusSchema.optional(),
});

export const updateVendorSchema = z.object({
  vendorName: z.string().min(1).max(255).optional(),
  vendorRegistrationDate: z.string().datetime().optional().nullable(),
  vendorBankAccount: z.string().max(100).optional().nullable(),
  vendorAddress: z.string().max(255).optional().nullable(),
  vendorContact: z.string().max(255).optional().nullable(),
  externalRef: z.string().max(100).optional().nullable(),
  metadata: z.any().optional(),
  status: vendorStatusSchema.optional(),
});

export const updateVendorStatusSchema = z.object({
  status: vendorStatusSchema,
});
