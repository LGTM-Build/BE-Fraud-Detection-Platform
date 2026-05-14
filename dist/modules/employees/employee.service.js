"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const prisma_1 = require("../../lib/prisma");
const app_error_1 = require("../../core/errors/app-error");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const client_1 = require("@prisma/client");
function normalizeOptionalText(value) {
    if (value === undefined || value === null)
        return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}
class EmployeeService {
    static async list(companyId) {
        return prisma_1.prisma.employee.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" },
        });
    }
    static async detail(companyId, id) {
        const employee = await prisma_1.prisma.employee.findFirst({
            where: { id, companyId },
        });
        if (!employee) {
            throw new app_error_1.AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
        }
        return employee;
    }
    static async create(actor, input) {
        const department = normalizeOptionalText(input.department);
        const position = normalizeOptionalText(input.position);
        const externalRef = normalizeOptionalText(input.externalRef);
        if (externalRef) {
            const duplicate = await prisma_1.prisma.employee.findFirst({
                where: {
                    companyId: actor.companyId,
                    externalRef,
                },
            });
            if (duplicate) {
                throw new app_error_1.AppError("External ref already exists", 409, "EMPLOYEE_EXTERNAL_REF_EXISTS");
            }
        }
        let employee;
        try {
            employee = await prisma_1.prisma.employee.create({
                data: {
                    companyId: actor.companyId,
                    fullName: input.fullName,
                    phoneNumber: input.phoneNumber,
                    department,
                    position,
                    externalRef,
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                throw new app_error_1.AppError("External ref already exists", 409, "EMPLOYEE_EXTERNAL_REF_EXISTS");
            }
            throw error;
        }
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "create_employee",
            targetType: "employee",
            targetId: employee.id,
            note: "Created employee",
            metadata: {
                fullName: employee.fullName,
                externalRef: employee.externalRef,
            },
        });
        return employee;
    }
    static async update(actor, id, input) {
        const existing = await prisma_1.prisma.employee.findFirst({
            where: { id, companyId: actor.companyId },
        });
        if (!existing) {
            throw new app_error_1.AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
        }
        const department = input.department === undefined
            ? existing.department
            : normalizeOptionalText(input.department);
        const position = input.position === undefined
            ? existing.position
            : normalizeOptionalText(input.position);
        const nextExternalRef = input.externalRef === undefined
            ? existing.externalRef
            : normalizeOptionalText(input.externalRef);
        if (nextExternalRef && nextExternalRef !== existing.externalRef) {
            const duplicate = await prisma_1.prisma.employee.findFirst({
                where: {
                    companyId: actor.companyId,
                    externalRef: nextExternalRef,
                },
            });
            if (duplicate) {
                throw new app_error_1.AppError("External ref already exists", 409, "EMPLOYEE_EXTERNAL_REF_EXISTS");
            }
        }
        let updated;
        try {
            updated = await prisma_1.prisma.employee.update({
                where: { id: existing.id },
                data: {
                    fullName: input.fullName ?? existing.fullName,
                    phoneNumber: input.phoneNumber === undefined || input.phoneNumber === "undefined"
                        ? existing.phoneNumber
                        : input.phoneNumber,
                    department,
                    position,
                    externalRef: nextExternalRef,
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                throw new app_error_1.AppError("External ref already exists", 409, "EMPLOYEE_EXTERNAL_REF_EXISTS");
            }
            throw error;
        }
        await audit_log_service_1.AuditLogService.create({
            companyId: actor.companyId,
            userId: actor.userId,
            action: "update_employee",
            targetType: "employee",
            targetId: updated.id,
            note: "Updated employee",
            metadata: {
                before: {
                    fullName: existing.fullName,
                    externalRef: existing.externalRef,
                    department: existing.department,
                    position: existing.position,
                    phoneNumber: existing.phoneNumber,
                },
                after: {
                    fullName: updated.fullName,
                    externalRef: updated.externalRef,
                    department: updated.department,
                    position: updated.position,
                    phoneNumber: updated.phoneNumber,
                },
            },
        });
        return updated;
    }
}
exports.EmployeeService = EmployeeService;
