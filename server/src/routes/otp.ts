import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { env } from "../lib/env.js";
import { query } from "../lib/db.js";
import { HttpError } from "../middleware/errorHandler.js";
import { signToken } from "../lib/auth.js";
import { createOtpSession } from "../lib/sessions.js";
import { getSupabaseAuth } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

export const otpRouter = Router();

// Stricter rate limit for OTP routes.
otpRouter.use(
  rateLimit({
    windowMs: 10 * 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
  })
);

const requestSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().max(254)
  })
  .strict();

otpRouter.post("/request", async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();

    // Supabase Auth OTP (phone-first).
    // NOTE: Do not return debug OTPs; this must work in production.
    const supabase = getSupabaseAuth();

    // Create/find user (email-first).
    let userId: number | undefined;

    const byEmail = await query<{ id: number }>("select id from users where email = $1 limit 1", [email]);
    userId = byEmail[0]?.id;

    if (!userId) {
      const created = await query<{ id: number }>(
        "insert into users (name, email, phone, is_verified) values ($1,$2,null,false) returning id",
        [parsed.data.name ?? null, email]
      );
      userId = created[0]?.id;
    } else {
      if (parsed.data.name) {
        await query("update users set name = coalesce(name, $1) where id = $2", [parsed.data.name, userId]);
      }
    }

    if (!userId) throw new HttpError(500, "Failed to create user");

    try {
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
        // Common cases: 429 rate limit, 400 invalid phone.
        throw new HttpError(status === 0 ? 502 : status, error.message || "Failed to send OTP", true);
      }
    } catch (e: any) {
      if (e instanceof HttpError) throw e;
      logger.warn({ err: String(e), email }, "supabase email otp request threw");
      throw new HttpError(502, "Failed to request OTP. Try again in a moment.", true);
    }

    return res.json({ ok: true, expiresInSeconds: env.OTP_EXPIRES_SECONDS });
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

otpRouter.post("/verify", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();

    const supabase = getSupabaseAuth();

    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: parsed.data.token, type: "email" });
      if (error) {
        const status = typeof (error as any).status === "number" ? (error as any).status : 400;
        logger.warn({ status, message: error.message, email }, "supabase email otp verify failed");
        throw new HttpError(status === 0 ? 400 : status, error.message || "Invalid OTP", true);
      }
    } catch (e: any) {
      if (e instanceof HttpError) throw e;
      logger.warn({ err: String(e), email }, "supabase email otp verify threw");
      throw new HttpError(502, "Failed to verify OTP. Try again.", true);
    }

    // Ensure a local user row exists for this email.
    const userRows = await query<{ id: number; email: string | null; name: string | null; is_verified: boolean }>(
      "select id, email, name, is_verified from users where email = $1 limit 1",
      [email]
    );

    let user = userRows[0];
    if (!user) {
      const created = await query<{ id: number; email: string | null; name: string | null; is_verified: boolean }>(
        "insert into users (name, email, phone, is_verified) values (null, $1, null, true) returning id, email, name, is_verified",
        [email]
      );
      user = created[0];
    } else if (!user.is_verified) {
      await query("update users set is_verified = true where id = $1", [user.id]);
    }

    if (!user) throw new HttpError(500, "Failed to verify user", true);

    const role: "admin" | "user" =
      env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase() ? "admin" : "user";

    const token = signToken({
      sub: String(user.id),
      email: user.email ?? undefined,
      role,
      name: user.name ?? undefined,
      provider: "otp"
    });

    await createOtpSession({ userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    return res.json({ ok: true, token, isVerified: true });
  } catch (err) {
    return next(err);
  }
});

// Legacy endpoints (kept to avoid confusing 404s if any old client calls them)
otpRouter.post("/request-both", (_req, res) => {
  return res.status(410).json({ ok: false, error: "Deprecated. Use /api/auth/otp/request" });
});

otpRouter.post("/verify-both", (_req, res) => {
  return res.status(410).json({ ok: false, error: "Deprecated. Use /api/auth/otp/verify" });
});
