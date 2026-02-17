import type { NextFunction, Request, Response } from "express";

import { HttpError } from "./errorHandler.js";
import { getBearerToken, verifyToken, type AuthTokenPayload } from "../lib/auth.js";
import { isOtpSessionActive } from "../lib/sessions.js";
import { query } from "../lib/db.js";

export type AuthedRequest = Request & { user?: AuthTokenPayload };

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) return next(new HttpError(401, "Unauthorized", true));

  try {
    req.user = verifyToken(token);
    // OTP-provider tokens must have an active session record.
    if (req.user.provider === "otp") {
      void (async () => {
        const ok = await isOtpSessionActive(token);
        if (!ok) return next(new HttpError(401, "Unauthorized", true));
        return next();
      })().catch(() => next(new HttpError(401, "Unauthorized", true)));
      return;
    }

    return next();
  } catch {
    return next(new HttpError(401, "Unauthorized", true));
  }
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Unauthorized", true));
  if (req.user.role !== "admin") return next(new HttpError(403, "Forbidden", true));

  const email = req.user.email?.toLowerCase();
  if (!email) return next(new HttpError(403, "Forbidden", true));

  void (async () => {
    const rows = await query<{ ok: number }>(
      "select 1 as ok from admin_users where email = $1 and is_active = true limit 1",
      [email]
    );

    if (!rows[0]?.ok) return next(new HttpError(403, "Forbidden", true));
    return next();
  })().catch(() => next(new HttpError(403, "Forbidden", true)));
}
