"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerCompanySchema = void 0;
const zod_1 = require("zod");
exports.registerCompanySchema = zod_1.z.object({
    companyName: zod_1.z.string().min(1).max(255),
    industry: zod_1.z.string().max(100).optional(),
    employeeCount: zod_1.z.number().int().min(1).optional(),
    fullName: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
