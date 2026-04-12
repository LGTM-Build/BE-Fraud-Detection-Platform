import { prisma } from "../../lib/prisma";
import { AppError } from "../../core/errors/app-error";
import {
  comparePassword,
  compareToken,
  hashPassword,
  hashToken,
} from "../../core/utils/hashing";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../core/utils/jwt";

function getRefreshTokenExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

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
          expiresAt: getRefreshTokenExpiryDate(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          lastUsedAt: new Date(),
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
        expiresAt: getRefreshTokenExpiryDate(),
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

  static async profile(userId: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
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
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  static async refreshToken(input: {
    refreshToken: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    let payload: ReturnType<typeof verifyRefreshToken>;

    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch (error) {
      throw new AppError(
        "Invalid or expired refresh token",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    if (payload.type !== "refresh") {
      throw new AppError("Invalid token type", 401, "INVALID_REFRESH_TOKEN");
    }

    const session = await prisma.userSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (!session) {
      throw new AppError("Session not found", 401, "SESSION_NOT_FOUND");
    }

    if (session.status !== "active" || session.revokedAt) {
      throw new AppError("Session has been revoked", 401, "SESSION_REVOKED");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new AppError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    const tokenMatch = await compareToken(
      input.refreshToken,
      session.refreshTokenHash,
    );

    if (!tokenMatch) {
      throw new AppError(
        "Refresh token mismatch",
        401,
        "REFRESH_TOKEN_MISMATCH",
      );
    }

    if (!session.user.isActive) {
      throw new AppError("User is inactive", 403, "USER_INACTIVE");
    }

    const newAccessToken = signAccessToken({
      sub: session.user.id,
      cid: session.user.companyId,
      role: session.user.role,
      sid: session.id,
    });

    const newRefreshToken = signRefreshToken({
      sub: session.user.id,
      cid: session.user.companyId,
      sid: session.id,
    });

    const newRefreshTokenHash = await hashToken(newRefreshToken);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        companyId: session.user.companyId,
        fullName: session.user.fullName,
        email: session.user.email,
        role: session.user.role,
        isActive: session.user.isActive,
      },
    };
  }

  static async logout(input: { refreshToken: string }) {
    let payload: ReturnType<typeof verifyRefreshToken>;

    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new AppError(
        "Invalid or expired refresh token",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    const session = await prisma.userSession.findUnique({
      where: { id: payload.sid },
    });

    if (!session) {
      throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    const tokenMatch = await compareToken(
      input.refreshToken,
      session.refreshTokenHash,
    );

    if (!tokenMatch) {
      throw new AppError(
        "Refresh token mismatch",
        401,
        "REFRESH_TOKEN_MISMATCH",
      );
    }

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
    });

    return {
      message: "Logout successful",
    };
  }
}
