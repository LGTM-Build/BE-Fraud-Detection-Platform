"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalApiKeyMiddleware = internalApiKeyMiddleware;
const env_1 = require("../config/env");
const app_error_1 = require("../core/errors/app-error");
function internalApiKeyMiddleware(req, _res, next) {
    const apiKey = req.header("x-internal-api-key");
    if (!apiKey) {
        return next(new app_error_1.AppError("Missing internal API key", 401, "INTERNAL_API_KEY_MISSING"));
    }
    if (apiKey !== env_1.env.INTERNAL_API_KEY) {
        return next(new app_error_1.AppError("Invalid internal API key", 401, "INTERNAL_API_KEY_INVALID"));
    }
    next();
}
