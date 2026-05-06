import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { AuditLogService } from "../audit-logs/audit-log.service";

export class EmployeeService {
  static async list(companyId: string) {
    return prisma.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async detail(companyId: string, id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
    }

    return employee;
  }

  static async create(
    actor: { userId: string; companyId: string },
    input: {
      fullName: string;
      phoneNumber: string;
      department?: string | null;
      position?: string | null;
      externalRef?: string | null;
    },
  ) {
    if (input.externalRef) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          companyId: actor.companyId,
          externalRef: input.externalRef,
        },
      });

      if (duplicate) {
        throw new AppError(
          "External ref already exists",
          409,
          "EMPLOYEE_EXTERNAL_REF_EXISTS",
        );
      }
    }

    const employee = await prisma.employee.create({
      data: {
        companyId: actor.companyId,
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        department: input.department ?? null,
        position: input.position ?? null,
        externalRef: input.externalRef ?? null,
      },
    });

    await AuditLogService.create({
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

  static async update(
    actor: { userId: string; companyId: string },
    id: string,
    input: {
      fullName?: string;
      phoneNumber: string;
      department?: string | null;
      position?: string | null;
      externalRef?: string | null;
    },
  ) {
    const existing = await prisma.employee.findFirst({
      where: { id, companyId: actor.companyId },
    });

    if (!existing) {
      throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
    }

    if (input.externalRef && input.externalRef !== existing.externalRef) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          companyId: actor.companyId,
          externalRef: input.externalRef,
        },
      });

      if (duplicate) {
        throw new AppError(
          "External ref already exists",
          409,
          "EMPLOYEE_EXTERNAL_REF_EXISTS",
        );
      }
    }

    const updated = await prisma.employee.update({
      where: { id: existing.id },
      data: {
        fullName: input.fullName ?? existing.fullName,
        phoneNumber:
          input.phoneNumber === undefined || input.phoneNumber === "undefined"
            ? existing.phoneNumber
            : input.phoneNumber,
        department:
          input.department === undefined
            ? existing.department
            : input.department,
        position:
          input.position === undefined ? existing.position : input.position,
        externalRef:
          input.externalRef === undefined
            ? existing.externalRef
            : input.externalRef,
      },
    });

    await AuditLogService.create({
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
