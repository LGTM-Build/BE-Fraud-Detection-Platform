"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeSchema = exports.createEmployeeSchema = void 0;
const zod_1 = require("zod");
exports.createEmployeeSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(255),
    phoneNumber: zod_1.z.string().max(50),
    department: zod_1.z.string().max(100).optional().nullable(),
    position: zod_1.z.string().max(100).optional().nullable(),
    avgMonthlyExpense: zod_1.z.number().nonnegative().optional().nullable(),
    externalRef: zod_1.z.string().max(100).optional().nullable(),
    metadata: zod_1.z.any().optional(),
});
exports.updateEmployeeSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(255).optional(),
    phoneNumber: zod_1.z.string().max(50).optional().default("undefined"),
    department: zod_1.z.string().max(100).optional().nullable(),
    position: zod_1.z.string().max(100).optional().nullable(),
    avgMonthlyExpense: zod_1.z.number().nonnegative().optional().nullable(),
    externalRef: zod_1.z.string().max(100).optional().nullable(),
    metadata: zod_1.z.any().optional(),
});
