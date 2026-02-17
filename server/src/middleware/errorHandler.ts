import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

export class HttpError extends Error {
  status: number;
  expose: boolean;
  constructor(status: number, message: string, expose = false) {
    super(message);
    this.status = status;
    this.expose = expose;
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Not found", true));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof HttpError) {
    if (!isProd || err.expose) {
      return res.status(err.status).json({ ok: false, error: err.message });
    }
    return res.status(err.status).json({ ok: false, error: "Request failed" });
  }

  const message = err instanceof Error ? err.message : String(err);
  const anyErr = err as any;
  const pgCode = anyErr?.code as string | undefined;

  // Postgres: missing table/column usually means the schema.sql wasn't applied after an update.
  if (pgCode === "42P01" || pgCode === "42703") {
    const hint = "Database schema is missing or out of date. Apply server/db/schema.sql to your Supabase/Postgres database, then redeploy.";
    logger.error({ err, message, pgCode }, "Database schema error");
    if (!isProd) {
      return res.status(500).json({ ok: false, error: `${message}\n${hint}` });
    }
    return res.status(503).json({ ok: false, error: hint });
  }

  logger.error({ err, message }, "Unhandled error");

  if (!isProd) {
    return res.status(500).json({ ok: false, error: message });
  }

  return res.status(500).json({ ok: false, error: "Internal server error" });
}
