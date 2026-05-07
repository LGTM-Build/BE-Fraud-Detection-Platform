"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function getEnv(name, required = true) {
    const value = process.env[name];
    if (!value && required) {
        throw new Error(`Missing required env: ${name}`);
    }
    return value || "";
}
exports.env = {
    PORT: Number(getEnv("PORT")),
    NODE_ENV: getEnv("NODE_ENV"),
    DATABASE_URL: getEnv("DATABASE_URL"),
    JWT_ACCESS_SECRET: getEnv("JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
    JWT_ACCESS_EXPIRES_IN: getEnv("JWT_ACCESS_EXPIRES_IN"),
    JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN"),
    APP_ORIGIN: getEnv("APP_ORIGIN"),
    BACKEND_BASE_URL: getEnv("BACKEND_BASE_URL"),
    INTERNAL_API_KEY: getEnv("INTERNAL_API_KEY"),
    PYTHON_FRAUD_API_URL: getEnv("PYTHON_FRAUD_API_URL"),
    PYTHON_FRAUD_API_KEY: getEnv("PYTHON_FRAUD_API_KEY"),
    PYTHON_FRAUD_TIMEOUT_MS: Number(getEnv("PYTHON_FRAUD_TIMEOUT_MS")),
};
