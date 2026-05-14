"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeSchema = exports.createEmployeeSchema = void 0;
const zod_1 = require("zod");
function nullableTrimmedString(max) {
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return value;
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
    }, zod_1.z.string().max(max).optional().nullable());
}
exports.createEmployeeSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(255),
    phoneNumber: zod_1.z.string().max(50),
    department: nullableTrimmedString(100),
    position: nullableTrimmedString(100),
    avgMonthlyExpense: zod_1.z.number().nonnegative().optional().nullable(),
    externalRef: nullableTrimmedString(100),
    metadata: zod_1.z.any().optional(),
});
exports.updateEmployeeSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(255).optional(),
    phoneNumber: zod_1.z.string().max(50).optional().default("undefined"),
    department: nullableTrimmedString(100),
    position: nullableTrimmedString(100),
    avgMonthlyExpense: zod_1.z.number().nonnegative().optional().nullable(),
    externalRef: nullableTrimmedString(100),
    metadata: zod_1.z.any().optional(),
});
