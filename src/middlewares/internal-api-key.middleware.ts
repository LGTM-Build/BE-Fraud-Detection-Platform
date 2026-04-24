import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../core/errors/app-error";

export function internalApiKeyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const apiKey = req.header("x-internal-api-key");

  if (!apiKey) {
    return next(
      new AppError("Missing internal API key", 401, "INTERNAL_API_KEY_MISSING"),
    );
  }

  if (apiKey !== env.INTERNAL_API_KEY) {
    return next(
      new AppError("Invalid internal API key", 401, "INTERNAL_API_KEY_INVALID"),
    );
  }

  next();
}
