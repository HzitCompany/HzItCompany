import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";

import { env } from "../lib/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getSupabaseAdmin, getSupabaseAuth } from "../lib/supabase.js";
import { query } from "../lib/db.js";
import { getBearerToken, signToken, verifyToken } from "../lib/auth.js";
import { createSession, isSessionActive, revokeSession } from "../lib/sessions.js";
import { clearSessionCookie, setSessionCookie } from "../lib/cookieSession.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

export const authSessionRouter = Router();

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function ensureLocalUserId(input: { email: string; name?: string | null }) {
  const email = input.email.toLowerCase();
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : null;

  const existing = await query<{ id: number; name: string | null }>(
    "select id, name from users where email = $1 limit 1",
    [email]
  );

  const row = existing[0];
  if (row?.id) {
    if (!row.name && name) {
      await query("update users set name = $1 where id = $2", [name, row.id]);
    }
    await query("update users set is_verified = true where id = $1 and is_verified = false", [row.id]);
    return row.id;
  }

  const created = await query<{ id: number }>(
    "insert into users (name, email, phone, is_verified) values ($1,$2,null,true) returning id",
    [name, email]
  );
  const createdId = created[0]?.id;
  if (!createdId) throw new HttpError(500, "Failed to create user", true);
  return createdId;
}

// Stricter auth endpoints rate limit.
authSessionRouter.use(
  rateLimit({
    windowMs: 10 * 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
  })
);

const emailOnlySchema = z
  .object({
    email: z.string().email().max(254)
  })
  .strict();

authSessionRouter.post("/auth/email-otp/request", async (req, res, next) => {
  try {
    const parsed = emailOnlySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();
    const supabase = getSupabaseAuth();
    const redirectTo = env.WEB_URL || env.CORS_ORIGINS?.[0] || "http://localhost:5173";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      const status = typeof (error as any).status === "number" ? (error as any).status : 500;
      logger.warn({ status, message: error.message, email }, "supabase email otp request failed");
      throw new HttpError(status === 0 ? 502 : status, error.message || "Failed to send OTP", true);
    }

    return res.json({ ok: true, message: "OTP sent to your email", expiresInSeconds: 600 });
  } catch (err) {
    return next(err);
  }
});

const verifySchema = z
  .object({
    email: z.string().email().max(254),
    token: z.string().regex(/^\d{6}$/)
  })
  .strict();

authSessionRouter.post("/auth/email-otp/verify", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();
    const supabase = getSupabaseAuth();

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data.token,
      type: "email"
    });

    if (error || !data?.user) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 400;
      logger.warn({ status, message: error?.message, email }, "supabase email otp verify failed");
      throw new HttpError(status === 0 ? 400 : status, error?.message || "Invalid OTP", true);
    }

    const user = data.user;
    const meta: any = user.user_metadata ?? {};
    const nameRaw =
      (typeof meta.full_name === "string" && meta.full_name.trim())
        ? meta.full_name.trim()
        : (typeof meta.name === "string" && meta.name.trim())
          ? meta.name.trim()
          : null;
    const name = nameRaw ?? null;
    const roleRaw = (meta.role ?? (user.app_metadata as any)?.role) as unknown;
    const role = roleRaw === "admin" ? "admin" : "user";

    const localUserId = await ensureLocalUserId({ email: user.email ?? email, name });

    const token = signToken({
      sub: String(localUserId),
      email: (user.email ?? email),
      role,
      name: name ?? undefined,
      provider: "otp"
    });

    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await createSession({ userId: localUserId, token, expiresAt });
    setSessionCookie(res, token, SESSION_MAX_AGE_MS);

    return res.json({
      ok: true,
      user: {
        id: String(localUserId),
        email: user.email ?? email,
        full_name: name,
        role
      }
    });
  } catch (err) {
    return next(err);
  }
});

const googleSchema = z
  .object({
    credential: z.string().min(20)
  })
  .strict();

authSessionRouter.post("/auth/google", async (req, res, next) => {
  try {
    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    if (!env.GOOGLE_CLIENT_ID) {
      throw new HttpError(503, "Google login is not configured on the backend", true);
    }

    // 1) Verify the ID token with Google.
    const oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await oauthClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (!email) throw new HttpError(400, "Google account is missing an email", true);

    // 2) Sign in to Supabase using the verified token.
    const supabase = getSupabaseAuth();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: parsed.data.credential
    });

    if (error || !data?.user) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 401;
      logger.warn({ status, message: error?.message, email }, "supabase google sign-in failed");
      throw new HttpError(status === 0 ? 502 : status, error?.message || "Google login failed", true);
    }

    const user = data.user;
    const meta: any = user.user_metadata ?? {};
    const nameRaw =
      (typeof meta.full_name === "string" && meta.full_name.trim())
        ? meta.full_name.trim()
        : (typeof meta.name === "string" && meta.name.trim())
          ? meta.name.trim()
          : null;
    const name = nameRaw ?? null;
    const roleRaw = (meta.role ?? (user.app_metadata as any)?.role) as unknown;
    const role = roleRaw === "admin" ? "admin" : "user";

    const localUserId = await ensureLocalUserId({ email: user.email ?? email, name });

    const token = signToken({
      sub: String(localUserId),
      email: (user.email ?? email),
      role,
      name: name ?? undefined,
      provider: "google"
    });

    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await createSession({ userId: localUserId, token, expiresAt });
    setSessionCookie(res, token, SESSION_MAX_AGE_MS);

    return res.json({
      ok: true,
      user: {
        id: String(localUserId),
        email: user.email ?? email,
        full_name: name,
        role
      }
    });
  } catch (err) {
    return next(err);
  }
});

authSessionRouter.get("/auth/me", async (req: AuthedRequest, res, next) => {
  try {
    // Soft auth: if no token / invalid token, return 200 with user: null (avoids browser 401 console errors).
    const anyReq = req as any;
    const cookieName = env.SESSION_COOKIE_NAME || "hz_session";
    const cookieToken =
      typeof anyReq?.cookies?.[cookieName] === "string" ? anyReq.cookies[cookieName] : null;
    const bearerToken = getBearerToken(req);
    const rawToken = cookieToken ?? bearerToken;

    if (!rawToken) return res.json({ ok: true, user: null });

    let payload;
    try {
      payload = verifyToken(rawToken);
    } catch {
      return res.json({ ok: true, user: null });
    }

    const active = await isSessionActive(rawToken).catch(() => false);
    if (!active) return res.json({ ok: true, user: null });

    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) return res.json({ ok: true, user: null });

    const rows = await query<{ id: number; name: string | null; email: string | null; is_verified: boolean }>(
      "select id, name, email, is_verified from users where id = $1 limit 1",
      [userId]
    );

    const u = rows[0];
    if (!u) return res.json({ ok: true, user: null });

    return res.json({
      ok: true,
      user: {
        id: String(u.id),
        email: u.email,
        full_name: u.name,
        role: payload.role,
        provider: payload.provider ?? null,
        isVerified: u.is_verified
      }
    });
  } catch (err) {
    return next(err);
  }
});

authSessionRouter.post("/auth/logout", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    // Prefer cookie token revocation; if not present, revocation is best-effort.
    const anyReq = req as any;
    const cookieName = env.SESSION_COOKIE_NAME || "hz_session";
    const cookieToken = typeof anyReq?.cookies?.[cookieName] === "string" ? anyReq.cookies[cookieName] : null;
    if (cookieToken) {
      await revokeSession(cookieToken);
    }

    clearSessionCookie(res);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
