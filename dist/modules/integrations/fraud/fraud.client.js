"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../../config/env");
const app_error_1 = require("../../../core/errors/app-error");
class FraudClient {
    static async submitBatch(payload) {
        try {
            const response = await axios_1.default.post(`${env_1.env.PYTHON_FRAUD_API_URL}/predict`, payload, {
                timeout: env_1.env.PYTHON_FRAUD_TIMEOUT_MS,
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": env_1.env.PYTHON_FRAUD_API_KEY,
                },
            });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new app_error_1.AppError(`Python fraud API error: ${error.response.status}`, 502, "PYTHON_FRAUD_API_ERROR");
            }
            if (error.code === "ECONNABORTED") {
                throw new app_error_1.AppError("Python fraud API timeout", 504, "PYTHON_FRAUD_API_TIMEOUT");
            }
            throw new app_error_1.AppError("Failed to connect to Python fraud API", 502, "PYTHON_FRAUD_API_UNAVAILABLE");
        }
    }
}
exports.FraudClient = FraudClient;
