import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import {
  comparePassword,
  hashPassword,
  hashToken,
} from "../../core/utils/hashing";
import { signAccessToken, signRefreshToken } from "../../core/utils/jwt";

export class AuthService {
  static async registerCompany(input: {
    companyName: string;
    industry?: string;
    employeeCount?: number;
    fullName: string;
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError(
        "Email already registered",
        409,
        "EMAIL_ALREADY_EXISTS",
      );
    }

    const passwordHash = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx: any) => {
      const company = await tx.company.create({
        data: {
          name: input.companyName,
          industry: input.industry,
          employeeCount: input.employeeCount,
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          role: "super_user",
        },
      });

      const session = await tx.userSession.create({
        data: {
          companyId: company.id,
          userId: user.id,
          refreshTokenHash: "TEMP",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });

      const accessToken = signAccessToken({
        sub: user.id,
        cid: company.id,
        role: user.role,
        sid: session.id,
      });

      const refreshToken = signRefreshToken({
        sub: user.id,
        cid: company.id,
        sid: session.id,
      });

      const refreshTokenHash = await hashToken(refreshToken);

      await tx.userSession.update({
        where: { id: session.id },
        data: { refreshTokenHash },
      });

      return {
        company,
        user,
        accessToken,
        refreshToken,
      };
    });

    return result;
  }

  static async login(input: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { company: true },
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new AppError("User is inactive", 403, "USER_INACTIVE");
    }

    const passwordMatch = await comparePassword(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatch) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const session = await prisma.userSession.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        refreshTokenHash: "TEMP",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        lastUsedAt: new Date(),
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      cid: user.companyId,
      role: user.role,
      sid: session.id,
    });

    const refreshToken = signRefreshToken({
      sub: user.id,
      cid: user.companyId,
      sid: session.id,
    });

    const refreshTokenHash = await hashToken(refreshToken);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
