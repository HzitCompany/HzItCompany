import type { NextFunction, Request, Response } from "express";

import { HttpError } from "./errorHandler.js";
import { getBearerToken, verifyToken, type AuthTokenPayload } from "../lib/auth.js";
import { isSessionActive } from "../lib/sessions.js";
import { env } from "../lib/env.js";

export type AuthedRequest = Request & { user?: AuthTokenPayload };

function getCookieSessionToken(req: Request) {
  const cookieName = env.SESSION_COOKIE_NAME || "hz_session";
  const anyReq = req as any;
  const cookies = anyReq?.cookies as Record<string, string> | undefined;
  const value = cookies?.[cookieName];
  return typeof value === "string" && value.trim() ? value : null;
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = getCookieSessionToken(req) ?? getBearerToken(req);
  if (!token) return next(new HttpError(401, "Unauthorized", true));

  try {
    req.user = verifyToken(token);
    void (async () => {
      const ok = await isSessionActive(token);
      if (!ok) return next(new HttpError(401, "Unauthorized", true));
      return next();
    })().catch(() => next(new HttpError(401, "Unauthorized", true)));
    return;
  } catch {
    return next(new HttpError(401, "Unauthorized", true));
  }
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Unauthorized", true));
  if (req.user.role !== "admin") return next(new HttpError(403, "Forbidden", true));
  return next();
}
