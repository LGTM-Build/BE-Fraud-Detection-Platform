import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, required = true): string {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value || "";
}

export const env = {
  PORT: Number(getEnv("PORT")),
  NODE_ENV: getEnv("NODE_ENV"),
  DATABASE_URL: getEnv("DATABASE_URL"),
  JWT_ACCESS_SECRET: getEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN: getEnv("JWT_ACCESS_EXPIRES_IN"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN"),
  APP_ORIGIN: getEnv("APP_ORIGIN"),
  INTERNAL_API_KEY: getEnv("INTERNAL_API_KEY"),
  PYTHON_FRAUD_API_URL: getEnv("PYTHON_FRAUD_API_URL"),
  PYTHON_FRAUD_API_KEY: getEnv("PYTHON_FRAUD_API_KEY"),
  PYTHON_FRAUD_TIMEOUT_MS: Number(getEnv("PYTHON_FRAUD_TIMEOUT_MS")),
};
