import { z } from "zod";

const procurementMethodEnum = z.enum([
  "pengadaan_langsung",
  "tender_terbuka",
  "tender_tertutup",
  "e_purchasing",
  "rfp",
  "lainnya",
]);

const reviewStatusEnum = z.enum([
  "pending",
  "reviewed",
  "requires_attention",
  "need_further_review",
]);

export const createProcurementSchema = z.object({
  vendorId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),

  purchaseId: z.string().max(100).optional().nullable(),
  poNumber: z.string().max(100).optional().nullable(),
  purchaseDate: z.string().datetime(),
  itemId: z.string().max(100).optional().nullable(),
  itemDescription: z.string().optional().nullable(),
  quantity: z.number().nonnegative().optional().nullable(),
  unitPrice: z.number().nonnegative().optional().nullable(),
  amountTotal: z.number().nonnegative(),
  department: z.string().max(100).optional().nullable(),
  method: procurementMethodEnum.optional(),

  approvalDate: z.string().datetime().optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  invoiceDate: z.string().datetime().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  contractId: z.string().max(100).optional().nullable(),
  contractDate: z.string().datetime().optional().nullable(),
  paymentDate: z.string().datetime().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

export const updateProcurementSchema = createProcurementSchema.partial();

export const updateProcurementStatusSchema = z.object({
  status: reviewStatusEnum,
  reviewerNote: z.string().optional().nullable(),
});

export const listProcurementQuerySchema = z.object({
  status: reviewStatusEnum.optional(),
  department: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  minScore: z.coerce.number().optional(),
  maxScore: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
