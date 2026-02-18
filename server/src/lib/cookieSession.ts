import type { Response } from "express";

import { env } from "./env.js";

export function getSessionCookieName() {
  return env.SESSION_COOKIE_NAME || "hz_session";
}

export function sessionCookieOptions() {
  const isProd = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/",
    domain: env.SESSION_COOKIE_DOMAIN || undefined
  };
}

export function setSessionCookie(res: Response, token: string, maxAgeMs: number) {
  res.cookie(getSessionCookieName(), token, {
    ...sessionCookieOptions(),
    maxAge: maxAgeMs
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(getSessionCookieName(), sessionCookieOptions());
}
