import type { RequestHandler } from "express";

let ready = false;

export function setDatabaseReady(value: boolean): void {
  ready = value;
}

export const requireDatabaseReady: RequestHandler = (_req, res, next) => {
  if (!ready) {
    res.setHeader("Retry-After", "5");
    res.status(503).json({
      error: "DATABASE_NOT_READY",
      message: "Course data is temporarily unavailable while the database reconnects. Please retry shortly.",
    });
    return;
  }
  next();
};
