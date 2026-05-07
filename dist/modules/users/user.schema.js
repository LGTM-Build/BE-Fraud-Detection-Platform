"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid().nullable().optional(),
    fullName: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
    role: zod_1.z.enum([
        "super_admin",
        "super_user",
        "auditor",
        "operator",
        "department_head",
    ]),
});
exports.updateUserSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid().nullable().optional(),
    fullName: zod_1.z.string().min(1).max(255).optional(),
    email: zod_1.z.string().email().optional(),
    role: zod_1.z
        .enum([
        "super_admin",
        "super_user",
        "auditor",
        "operator",
        "department_head",
    ])
        .optional(),
});
