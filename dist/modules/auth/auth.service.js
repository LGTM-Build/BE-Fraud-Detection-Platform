"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../../lib/prisma");
const app_error_1 = require("../../core/errors/app-error");
const hashing_1 = require("../../core/utils/hashing");
const jwt_1 = require("../../core/utils/jwt");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
function getRefreshTokenExpiryDate() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
class AuthService {
    static async registerCompany(input) {
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: input.email },
        });
        if (existingUser) {
            throw new app_error_1.AppError("Email already registered", 409, "EMAIL_ALREADY_EXISTS");
        }
        const passwordHash = await (0, hashing_1.hashPassword)(input.password);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
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
            const employee = await tx.employee.create({
                data: {
                    companyId: company.id,
                    fullName: input.fullName,
                    phoneNumber: "08000000000",
                    position: "Owner",
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
            const accessToken = (0, jwt_1.signAccessToken)({
                sub: user.id,
                cid: company.id,
                role: user.role,
                sid: session.id,
            });
            const refreshToken = (0, jwt_1.signRefreshToken)({
                sub: user.id,
                cid: company.id,
                sid: session.id,
            });
            const refreshTokenHash = await (0, hashing_1.hashToken)(refreshToken);
            await tx.userSession.update({
                where: { id: session.id },
                data: { refreshTokenHash },
            });
            await tx.auditLog.create({
                data: {
                    companyId: company.id,
                    userId: user.id,
                    action: "register_company",
                    targetType: "company",
                    targetId: company.id,
                    note: `Company ${company.name} registered with user ${user.email}`,
                    metadata: {
                        email: user.email,
                        role: user.role,
                    },
                },
            });
            return {
                company,
                user,
                employee,
                accessToken,
                refreshToken,
            };
        });
        return result;
    }
    static async login(input) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: input.email },
            include: { company: true },
        });
        if (!user) {
            throw new app_error_1.AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
        }
        if (!user.isActive) {
            throw new app_error_1.AppError("User is inactive", 403, "USER_INACTIVE");
        }
        const passwordMatch = await (0, hashing_1.comparePassword)(input.password, user.passwordHash);
        if (!passwordMatch) {
            throw new app_error_1.AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
        }
        const session = await prisma_1.prisma.userSession.create({
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
        const accessToken = (0, jwt_1.signAccessToken)({
            sub: user.id,
            cid: user.companyId,
            role: user.role,
            sid: session.id,
        });
        const refreshToken = (0, jwt_1.signRefreshToken)({
            sub: user.id,
            cid: user.companyId,
            sid: session.id,
        });
        const refreshTokenHash = await (0, hashing_1.hashToken)(refreshToken);
        await prisma_1.prisma.userSession.update({
            where: { id: session.id },
            data: {
                refreshTokenHash,
            },
        });
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
            },
        });
        await audit_log_service_1.AuditLogService.create({
            companyId: user.companyId,
            userId: user.id,
            action: "login",
            targetType: "auth",
            targetId: user.id,
            note: `User ${user.email} logged in`,
            metadata: {
                email: user.email,
                role: user.role,
            },
        });
        return {
            user,
            accessToken,
            refreshToken,
        };
    }
    static async profile(userId, companyId) {
        const user = await prisma_1.prisma.user.findFirst({
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
            throw new app_error_1.AppError("User not found", 404, "USER_NOT_FOUND");
        }
        return user;
    }
    static async refreshToken(input) {
        let payload;
        try {
            payload = (0, jwt_1.verifyRefreshToken)(input.refreshToken);
        }
        catch (error) {
            throw new app_error_1.AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
        }
        if (payload.type !== "refresh") {
            throw new app_error_1.AppError("Invalid token type", 401, "INVALID_REFRESH_TOKEN");
        }
        const session = await prisma_1.prisma.userSession.findUnique({
            where: { id: payload.sid },
            include: { user: true },
        });
        if (!session) {
            throw new app_error_1.AppError("Session not found", 401, "SESSION_NOT_FOUND");
        }
        if (session.status !== "active" || session.revokedAt) {
            throw new app_error_1.AppError("Session has been revoked", 401, "SESSION_REVOKED");
        }
        if (session.expiresAt.getTime() < Date.now()) {
            throw new app_error_1.AppError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
        }
        const tokenMatch = await (0, hashing_1.compareToken)(input.refreshToken, session.refreshTokenHash);
        if (!tokenMatch) {
            throw new app_error_1.AppError("Refresh token mismatch", 401, "REFRESH_TOKEN_MISMATCH");
        }
        if (!session.user.isActive) {
            throw new app_error_1.AppError("User is inactive", 403, "USER_INACTIVE");
        }
        const newAccessToken = (0, jwt_1.signAccessToken)({
            sub: session.user.id,
            cid: session.user.companyId,
            role: session.user.role,
            sid: session.id,
        });
        const newRefreshToken = (0, jwt_1.signRefreshToken)({
            sub: session.user.id,
            cid: session.user.companyId,
            sid: session.id,
        });
        const newRefreshTokenHash = await (0, hashing_1.hashToken)(newRefreshToken);
        await prisma_1.prisma.userSession.update({
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
    static async logout(input) {
        let payload;
        try {
            payload = (0, jwt_1.verifyRefreshToken)(input.refreshToken);
        }
        catch {
            throw new app_error_1.AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
        }
        const session = await prisma_1.prisma.userSession.findUnique({
            where: { id: payload.sid },
        });
        if (!session) {
            throw new app_error_1.AppError("Session not found", 404, "SESSION_NOT_FOUND");
        }
        const tokenMatch = await (0, hashing_1.compareToken)(input.refreshToken, session.refreshTokenHash);
        if (!tokenMatch) {
            throw new app_error_1.AppError("Refresh token mismatch", 401, "REFRESH_TOKEN_MISMATCH");
        }
        await prisma_1.prisma.userSession.update({
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
exports.AuthService = AuthService;
