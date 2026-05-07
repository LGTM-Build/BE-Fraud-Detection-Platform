"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const app_error_1 = require("../core/errors/app-error");
function requireRole(roles) {
    return (req, _res, next) => {
        if (!req.auth) {
            return next(new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED"));
        }
        if (!roles.includes(req.auth.role)) {
            return next(new app_error_1.AppError("Forbidden", 403, "FORBIDDEN"));
        }
        next();
    };
}
