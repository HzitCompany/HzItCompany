import { randomInt } from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";

import { env } from "../lib/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getSupabaseAdmin, getSupabaseAuth } from "../lib/supabase.js";
import { query } from "../lib/db.js";
import { getBearerToken, signToken, verifyToken } from "../lib/auth.js";
import { createSession, isSessionActive, revokeSession } from "../lib/sessions.js";
import { clearSessionCookie, setSessionCookie } from "../lib/cookieSession.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { sendOtpEmail } from "../lib/email/resend.js";

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
    const expiresInSeconds = env.OTP_EXPIRES_SECONDS ?? 300;

    // 1) Ensure the user exists in our own DB.
    const userId = await ensureLocalUserId({ email });

    // 2) Generate an 8-digit numeric OTP.
    const otpPlain = randomInt(10_000_000, 99_999_999).toString();

    // 3) Hash it with bcrypt.
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpPlain, salt);

    // 4) Persist in otp_codes (invalidate previous ones first).
    await query(
      `update otp_codes set consumed_at = now()
       where user_id = $1 and channel = 'email' and consumed_at is null and expires_at > now()`,
      [userId]
    );
    await query(
      `insert into otp_codes (user_id, channel, destination, otp_hash, otp_salt, expires_at)
       values ($1, 'email', $2, $3, $4, now() + ($5 || ' seconds')::interval)`,
      [userId, email, otpHash, salt, expiresInSeconds]
    );

    // 5) Send via Resend.
    try {
      await sendOtpEmail({ to: email, otp: otpPlain, expiresInSeconds });
    } catch (mailErr: any) {
      logger.error({ err: mailErr, email }, "Failed to send OTP email via Resend");
      throw new HttpError(503, "Failed to send OTP email. Please try again later or use Google Sign In.", true);
    }

    logger.info({ email, userId }, "email OTP sent via Resend");
    return res.json({ ok: true, message: "OTP sent to your email", expiresInSeconds });
  } catch (err) {
    return next(err);
  }
});

const verifySchema = z
  .object({
    email: z.string().email().max(254),
    token: z.string().regex(/^\d{8}$/)
  })
  .strict();

authSessionRouter.post("/auth/email-otp/verify", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();
    const otpPlain = parsed.data.token;

    // 1) Look up user.
    const userRows = await query<{ id: number; name: string | null }>("select id, name from users where email = $1 limit 1", [email]);
    const userRow = userRows[0];
    if (!userRow) {
      throw new HttpError(400, "Invalid or expired OTP", true);
    }

    // 2) Find latest valid OTP code.
    const otpRows = await query<{ id: number; otp_hash: string }>(
      `select id, otp_hash from otp_codes
       where user_id = $1 and channel = 'email' and consumed_at is null and expires_at > now()
       order by expires_at desc limit 1`,
      [userRow.id]
    );
    const otpRow = otpRows[0];
    if (!otpRow) {
      throw new HttpError(400, "OTP has expired or was already used. Please request a new one.", true);
    }

    // 3) Verify hash.
    const match = await bcrypt.compare(otpPlain, otpRow.otp_hash);
    if (!match) {
      logger.warn({ email, userId: userRow.id }, "email OTP verify failed — wrong code");
      throw new HttpError(400, "Invalid OTP code", true);
    }

    // 4) Mark as consumed.
    await query("update otp_codes set consumed_at = now() where id = $1", [otpRow.id]);

    // 5) Determine role (admin email check).
    const role: "admin" | "user" = env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
    const name = userRow.name ?? null;

    // 6) Issue session cookie.
    const token = signToken({
      sub: String(userRow.id),
      email,
      role,
      name: name ?? undefined,
      provider: "otp"
    });

    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await createSession({ userId: userRow.id, token, expiresAt });
    setSessionCookie(res, token, SESSION_MAX_AGE_MS);

    logger.info({ email, userId: userRow.id, role }, "email OTP verified — session created");
    return res.json({
      ok: true,
      user: {
        id: String(userRow.id),
        email,
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

// ── Magic link / token exchange ───────────────────────────────────────────────
// When Supabase sends a magic link, clicking it lands the user on the site URL
// with #access_token=... in the hash. The frontend strips this and sends it here
// so we can verify it server-side and issue our own cookie session.
const tokenExchangeSchema = z
  .object({
    access_token: z.string().min(10)
  })
  .strict();

authSessionRouter.post("/auth/token-exchange", async (req, res, next) => {
  try {
    const parsed = tokenExchangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    // Ask Supabase to validate the access_token and return the user.
    const supabase = getSupabaseAuth();
    const { data, error } = await supabase.auth.getUser(parsed.data.access_token);
    if (error || !data?.user) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 401;
      logger.warn({ status, message: error?.message }, "magic link token exchange failed");
      throw new HttpError(status === 0 ? 401 : status, error?.message || "Invalid or expired magic link", true);
    }

    const user = data.user;
    const email = user.email?.toLowerCase();
    if (!email) throw new HttpError(400, "No email on the Supabase account", true);

    const meta: any = user.user_metadata ?? {};
    const nameRaw =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ? meta.full_name.trim()
        : (typeof meta.name === "string" && meta.name.trim()) ? meta.name.trim()
        : null;
    const roleRaw = (meta.role ?? (user.app_metadata as any)?.role) as unknown;
    const role = roleRaw === "admin" ? "admin" : "user";

    const localUserId = await ensureLocalUserId({ email, name: nameRaw });

    const token = signToken({
      sub: String(localUserId),
      email,
      role,
      name: nameRaw ?? undefined,
      provider: "otp"
    });

    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await createSession({ userId: localUserId, token, expiresAt });
    setSessionCookie(res, token, SESSION_MAX_AGE_MS);

    return res.json({
      ok: true,
      user: { id: String(localUserId), email, full_name: nameRaw, role }
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
