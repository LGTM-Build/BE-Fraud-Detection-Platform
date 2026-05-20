import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, required = true): string {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value || "";
}

function getNumberEnv(name: string, defaultValue?: number): number {
  const value = process.env[name];

  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required env: ${name}`);
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric env: ${name}`);
  }

  return parsed;
}

export const env = {
  PORT: getNumberEnv("PORT"),
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
  PYTHON_FRAUD_TIMEOUT_MS: getNumberEnv("PYTHON_FRAUD_TIMEOUT_MS"),
  PYTHON_FRAUD_BATCH_CHUNK_SIZE: getNumberEnv(
    "PYTHON_FRAUD_BATCH_CHUNK_SIZE",
    100,
  ),
  FRAUD_HISTORY_SOURCE: getEnv("FRAUD_HISTORY_SOURCE", false) || "backend_db",
  PYTHON_FRAUD_CALLBACK_MODE:
    getEnv("PYTHON_FRAUD_CALLBACK_MODE", false) || "batch",
};
