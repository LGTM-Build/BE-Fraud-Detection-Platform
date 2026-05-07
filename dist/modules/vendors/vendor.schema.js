"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVendorStatusSchema = exports.updateVendorSchema = exports.createVendorSchema = exports.vendorStatusSchema = void 0;
const zod_1 = require("zod");
exports.vendorStatusSchema = zod_1.z.enum(["active", "inactive", "blacklisted"]);
exports.createVendorSchema = zod_1.z.object({
    vendorName: zod_1.z.string().min(1).max(255),
    metadata: zod_1.z.any().optional(),
    status: exports.vendorStatusSchema.optional(),
});
exports.updateVendorSchema = zod_1.z.object({
    vendorName: zod_1.z.string().min(1).max(255).optional(),
    metadata: zod_1.z.any().optional(),
    status: exports.vendorStatusSchema.optional(),
});
exports.updateVendorStatusSchema = zod_1.z.object({
    status: exports.vendorStatusSchema,
});
