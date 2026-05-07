"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_1 = require("../core/utils/jwt");
const app_error_1 = require("../core/errors/app-error");
function authMiddleware(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.auth = {
            userId: payload.sub,
            companyId: payload.cid,
            role: payload.role,
            sessionId: payload.sid,
        };
        next();
    }
    catch {
        return next(new app_error_1.AppError("Invalid or expired token", 401, "INVALID_TOKEN"));
    }
}
