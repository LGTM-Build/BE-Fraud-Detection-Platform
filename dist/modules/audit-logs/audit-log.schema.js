"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogQuerySchema = void 0;
const zod_1 = require("zod");
exports.listAuditLogQuerySchema = zod_1.z.object({
    action: zod_1.z.string().optional(),
    targetType: zod_1.z.string().optional(),
    userId: zod_1.z.string().uuid().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
});
