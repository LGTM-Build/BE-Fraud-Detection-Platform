"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const app_error_1 = require("../core/errors/app-error");
const zod_1 = require("zod");
function errorMiddleware(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors: err.flatten(),
        });
    }
    if (err instanceof app_error_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message,
        });
    }
    console.error(err);
    return res.status(500).json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
    });
}
