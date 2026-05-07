"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const prisma_1 = require("../../lib/prisma");
const app_error_1 = require("../../core/errors/app-error");
const hashing_1 = require("../../core/utils/hashing");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
class UserService {
    static async list(companyId) {
        return prisma_1.prisma.user.findMany({
            where: { companyId },
            select: {
                id: true,
                companyId: true,
                employeeId: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
    static async detail(companyId, id) {
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                id,
                companyId,
            },
            select: {
                id: true,
                companyId: true,
                employeeId: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        department: true,
                        position: true,
                        externalRef: true,
                    },
                },
            },
        });
        if (!user) {
            throw new app_error_1.AppError("User not found", 404, "USER_NOT_FOUND");
        }
        return user;
    }
    static async create(actor, input) {
        const existingEmail = await prisma_1.prisma.user.findUnique({
            where: { email: input.email },
        });
        if (existingEmail) {
            throw new app_error_1.AppError("Email already registered", 409, "EMAIL_ALREADY_EXISTS");
        }
        if (input.employeeId) {
            const employee = await prisma_1.prisma.employee.findFirst({
                where: {
                    id: input.employeeId,
                    companyId: actor.companyId,
                },
            });
            if (!employee) {
                throw new app_error_1.AppError("Employee not found in this company", 404, "EMPLOYEE_NOT_FOUND");
            }
        }
        const passwordHash = await (0, hashing_1.hashPassword)(input.password);
        const user = await prisma_1.prisma.user.create({
            data: {
                companyId: actor.companyId,
                employeeId: input.employeeId ?? null,
                fullName: input.fullName,
                email: input.email,
                passwordHash,
                role: input.role,
            },
            select: {
                id: true,
                companyId: true,
                employeeId: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "create_user",
            targetType: "user",
            targetId: user.id,
            note: "Created new user",
            metadata: {
                email: user.email,
                role: user.role,
                employeeId: user.employeeId,
            },
        });
        return user;
    }
    static async update(actor, id, input) {
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                id,
                companyId: actor.companyId,
            },
        });
        if (!existingUser) {
            throw new app_error_1.AppError("User not found", 404, "USER_NOT_FOUND");
        }
        if (input.email && input.email !== existingUser.email) {
            const duplicateEmail = await prisma_1.prisma.user.findUnique({
                where: { email: input.email },
            });
            if (duplicateEmail) {
                throw new app_error_1.AppError("Email already registered", 409, "EMAIL_ALREADY_EXISTS");
            }
        }
        if (input.employeeId) {
            const employee = await prisma_1.prisma.employee.findFirst({
                where: {
                    id: input.employeeId,
                    companyId: actor.companyId,
                },
            });
            if (!employee) {
                throw new app_error_1.AppError("Employee not found in this company", 404, "EMPLOYEE_NOT_FOUND");
            }
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: existingUser.id },
            data: {
                employeeId: input.employeeId === undefined
                    ? existingUser.employeeId
                    : input.employeeId,
                fullName: input.fullName ?? existingUser.fullName,
                email: input.email ?? existingUser.email,
                role: input.role ?? existingUser.role,
            },
            select: {
                id: true,
                companyId: true,
                employeeId: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "update_user",
            targetType: "user",
            targetId: updatedUser.id,
            note: "Updated user data",
            metadata: {
                before: {
                    fullName: existingUser.fullName,
                    email: existingUser.email,
                    role: existingUser.role,
                    employeeId: existingUser.employeeId,
                },
                after: {
                    fullName: updatedUser.fullName,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    employeeId: updatedUser.employeeId,
                },
            },
        });
        return updatedUser;
    }
    static async toggleActive(actor, id) {
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                id,
                companyId: actor.companyId,
            },
        });
        if (!user) {
            throw new app_error_1.AppError("User not found", 404, "USER_NOT_FOUND");
        }
        if (user.id === actor.userId) {
            throw new app_error_1.AppError("You cannot deactivate your own account", 400, "SELF_TOGGLE_FORBIDDEN");
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                isActive: !user.isActive,
            },
            select: {
                id: true,
                companyId: true,
                employeeId: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "toggle_user_active",
            targetType: "user",
            targetId: updatedUser.id,
            note: `User active status changed to ${updatedUser.isActive}`,
            metadata: {
                previousIsActive: user.isActive,
                currentIsActive: updatedUser.isActive,
            },
        });
        return updatedUser;
    }
}
exports.UserService = UserService;
