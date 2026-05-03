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
  "alert",
  "high_alert",
  "auto_approved",
  "approved",
  "rejected",
]);

export const createProcurementSchema = z.object({
  employeeId: z.string().uuid().optional().nullable(),
  purchaseId: z.string().max(100).optional().nullable(),
  purchaseDate: z.string().datetime(),
  vendorName: z.string().min(1).max(255),
  itemDescription: z.string().min(1),
  department: z.string().max(100).optional().nullable(),
  amountTotal: z.number().nonnegative(),
  procurementMethod: procurementMethodEnum.optional(),
});

export const updateProcurementSchema = createProcurementSchema.partial();

export const reviewProcurementSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const listProcurementMonitorQuerySchema = z.object({
  status: reviewStatusEnum.optional(),
  group: z.enum(["ml_pending", "needs_review", "reviewed"]).optional(),
  department: z.string().optional(),
  searchVendor: z.string().optional(),
  searchItem: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
