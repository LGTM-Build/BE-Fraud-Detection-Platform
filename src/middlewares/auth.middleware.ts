import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../core/utils/jwt";
import { AppError } from "../core/errors/app-error";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);

    req.auth = {
      userId: payload.sub,
      companyId: payload.cid,
      role: payload.role,
      sessionId: payload.sid,
    };

    next();
  } catch {
    return next(new AppError("Invalid or expired token", 401, "INVALID_TOKEN"));
  }
}
