"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProcurementStatusSchema = exports.listProcurementTransactionsQuerySchema = exports.listProcurementMonitorQuerySchema = exports.reviewProcurementSchema = exports.updateProcurementSchema = exports.createProcurementSchema = exports.reviewStatusEnum = exports.procurementMethodEnum = void 0;
const zod_1 = require("zod");
exports.procurementMethodEnum = zod_1.z.enum([
    "pengadaan_langsung",
    "tender_terbuka",
    "tender_tertutup",
    "e_purchasing",
    "rfp",
    "lainnya",
]);
exports.reviewStatusEnum = zod_1.z.enum([
    "pending",
    "alert",
    "high_alert",
    "auto_approved",
    "approved",
    "rejected",
]);
exports.createProcurementSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid().optional().nullable(),
    purchaseId: zod_1.z.string().max(100).optional().nullable(),
    purchaseDate: zod_1.z.string().datetime(),
    vendorName: zod_1.z.string().min(1).max(255),
    itemDescription: zod_1.z.string().min(1),
    department: zod_1.z.string().max(100).optional().nullable(),
    amountTotal: zod_1.z.number().nonnegative(),
    procurementMethod: exports.procurementMethodEnum.optional(),
});
exports.updateProcurementSchema = exports.createProcurementSchema.partial();
exports.reviewProcurementSchema = zod_1.z.object({
    status: zod_1.z.enum(["approved", "rejected"]),
});
exports.listProcurementMonitorQuerySchema = zod_1.z.object({
    status: exports.reviewStatusEnum.optional(),
    group: zod_1.z.enum(["ml_pending", "needs_review", "reviewed"]).optional(),
    department: zod_1.z.string().optional(),
    searchVendor: zod_1.z.string().optional(),
    searchItem: zod_1.z.string().optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
/**
 * FE bisa kirim:
 * ?status=pending,alert,high_alert
 * ?businessUnit=IT
 * ?search=vendor/item
 * ?page=1
 * ?limit=20
 */
exports.listProcurementTransactionsQuerySchema = zod_1.z.object({
    status: zod_1.z
        .string()
        .optional()
        .transform((value) => {
        if (!value)
            return undefined;
        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    })
        .pipe(zod_1.z.array(exports.reviewStatusEnum).optional()),
    businessUnit: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    searchVendor: zod_1.z.string().optional(),
    searchItem: zod_1.z.string().optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
exports.updateProcurementStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["approved", "rejected"]),
});
