import "express";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        companyId: string;
        role: string;
        sessionId: string;
      };
    }
  }
}
