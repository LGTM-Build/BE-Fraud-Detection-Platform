"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const prisma_1 = require("../../lib/prisma");
const app_error_1 = require("../../core/errors/app-error");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
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
        if (input.externalRef) {
            const duplicate = await prisma_1.prisma.employee.findFirst({
                where: {
                    companyId: actor.companyId,
                    externalRef: input.externalRef,
                },
            });
            if (duplicate) {
                throw new app_error_1.AppError("External ref already exists", 409, "EMPLOYEE_EXTERNAL_REF_EXISTS");
            }
        }
        const employee = await prisma_1.prisma.employee.create({
            data: {
                companyId: actor.companyId,
                fullName: input.fullName,
                phoneNumber: input.phoneNumber,
                department: input.department ?? null,
                position: input.position ?? null,
                externalRef: input.externalRef ?? null,
            },
        });
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
        if (input.externalRef && input.externalRef !== existing.externalRef) {
            const duplicate = await prisma_1.prisma.employee.findFirst({
                where: {
                    companyId: actor.companyId,
                    externalRef: input.externalRef,
                },
            });
            if (duplicate) {
                throw new app_error_1.AppError("External ref already exists", 409, "EMPLOYEE_EXTERNAL_REF_EXISTS");
            }
        }
        const updated = await prisma_1.prisma.employee.update({
            where: { id: existing.id },
            data: {
                fullName: input.fullName ?? existing.fullName,
                phoneNumber: input.phoneNumber === undefined || input.phoneNumber === "undefined"
                    ? existing.phoneNumber
                    : input.phoneNumber,
                department: input.department === undefined
                    ? existing.department
                    : input.department,
                position: input.position === undefined ? existing.position : input.position,
                externalRef: input.externalRef === undefined
                    ? existing.externalRef
                    : input.externalRef,
            },
        });
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
