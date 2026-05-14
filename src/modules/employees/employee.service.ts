import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import { AuditLogService } from "../audit-logs/audit-log.service";
import { Prisma } from "@prisma/client";

function normalizeOptionalText(value?: string | null) {
  if (value === undefined || value === null) return null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

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
    const department = normalizeOptionalText(input.department);
    const position = normalizeOptionalText(input.position);
    const externalRef = normalizeOptionalText(input.externalRef);

    if (externalRef) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          companyId: actor.companyId,
          externalRef,
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

    let employee;

    try {
      employee = await prisma.employee.create({
        data: {
          companyId: actor.companyId,
          fullName: input.fullName,
          phoneNumber: input.phoneNumber,
          department,
          position,
          externalRef,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "External ref already exists",
          409,
          "EMPLOYEE_EXTERNAL_REF_EXISTS",
        );
      }

      throw error;
    }

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

    const department =
      input.department === undefined
        ? existing.department
        : normalizeOptionalText(input.department);
    const position =
      input.position === undefined
        ? existing.position
        : normalizeOptionalText(input.position);
    const nextExternalRef =
      input.externalRef === undefined
        ? existing.externalRef
        : normalizeOptionalText(input.externalRef);

    if (nextExternalRef && nextExternalRef !== existing.externalRef) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          companyId: actor.companyId,
          externalRef: nextExternalRef,
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

    let updated;

    try {
      updated = await prisma.employee.update({
        where: { id: existing.id },
        data: {
          fullName: input.fullName ?? existing.fullName,
          phoneNumber:
            input.phoneNumber === undefined || input.phoneNumber === "undefined"
              ? existing.phoneNumber
              : input.phoneNumber,
          department,
          position,
          externalRef: nextExternalRef,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "External ref already exists",
          409,
          "EMPLOYEE_EXTERNAL_REF_EXISTS",
        );
      }

      throw error;
    }

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
