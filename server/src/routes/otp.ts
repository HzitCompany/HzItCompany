import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { env } from "../lib/env.js";
import { query } from "../lib/db.js";
import { normalizeIndianPhoneE164 } from "../lib/phone.js";
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
    email: z.string().email().max(254).optional(),
    phone: z.string().min(8).max(20)
  })
  .strict();

otpRouter.post("/request", async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const phoneE164 = normalizeIndianPhoneE164(parsed.data.phone);
    const email = parsed.data.email?.toLowerCase();

    // Supabase Auth OTP (phone-first).
    // NOTE: Do not return debug OTPs; this must work in production.
    const supabase = getSupabaseAuth();

    // Create/find user (phone-first).
    let userId: number | undefined;

    const byPhone = await query<{ id: number }>("select id from users where phone = $1 limit 1", [phoneE164]);
    userId = byPhone[0]?.id;

    if (!userId) {
      const created = await query<{ id: number }>(
        "insert into users (name, email, phone, is_verified) values ($1,$2,$3,false) returning id",
        [parsed.data.name ?? null, email ?? null, phoneE164]
      );
      userId = created[0]?.id;
    } else {
      // Best-effort enrich profile.
      if (email || parsed.data.name) {
        await query(
          "update users set email = coalesce(email, $1), name = coalesce(name, $2) where id = $3",
          [email ?? null, parsed.data.name ?? null, userId]
        );
      }
    }

    if (!userId) throw new HttpError(500, "Failed to create user");

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
      if (error) {
        const status = typeof (error as any).status === "number" ? (error as any).status : 500;
        logger.warn(
          { status, message: error.message, phoneLast4: phoneE164.slice(-4) },
          "supabase otp request failed"
        );
        // Common cases: 429 rate limit, 400 invalid phone.
        throw new HttpError(status === 0 ? 502 : status, error.message || "Failed to send OTP", true);
      }
    } catch (e: any) {
      if (e instanceof HttpError) throw e;
      logger.warn({ err: String(e), phoneLast4: phoneE164.slice(-4) }, "supabase otp request threw");
      throw new HttpError(502, "Failed to request OTP. Try again in a moment.", true);
    }

    return res.json({ ok: true, expiresInSeconds: env.OTP_EXPIRES_SECONDS });
  } catch (err) {
    return next(err);
  }
});

const verifySchema = z
  .object({
    phone: z.string().min(8).max(20),
    otp: z.string().regex(/^\d{6}$/)
  })
  .strict();

otpRouter.post("/verify", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const phoneE164 = normalizeIndianPhoneE164(parsed.data.phone);

    const supabase = getSupabaseAuth();

    try {
      const { error } = await supabase.auth.verifyOtp({ phone: phoneE164, token: parsed.data.otp, type: "sms" });
      if (error) {
        const status = typeof (error as any).status === "number" ? (error as any).status : 400;
        logger.warn(
          { status, message: error.message, phoneLast4: phoneE164.slice(-4) },
          "supabase otp verify failed"
        );
        throw new HttpError(status === 0 ? 400 : status, error.message || "Invalid OTP", true);
      }
    } catch (e: any) {
      if (e instanceof HttpError) throw e;
      logger.warn({ err: String(e), phoneLast4: phoneE164.slice(-4) }, "supabase otp verify threw");
      throw new HttpError(502, "Failed to verify OTP. Try again.", true);
    }

    const userRows = await query<{ id: number; email: string | null; name: string | null; is_verified: boolean }>(
      "select id, email, name, is_verified from users where phone = $1 limit 1",
      [phoneE164]
    );

    const user = userRows[0];
    if (!user) throw new HttpError(404, "User not found", true);
    await query("update users set is_verified = true where id = $1", [user.id]);

    let role: "admin" | "client" = "client";
    const userEmail = user.email?.toLowerCase();
    if (userEmail) {
      // Backwards-compatible bootstrap: if ADMIN_EMAIL matches, ensure it's present in admin_users.
      if (env.ADMIN_EMAIL && userEmail === env.ADMIN_EMAIL.toLowerCase()) {
        await query(
          "insert into admin_users (email, is_active) values ($1, true) on conflict (email) do update set is_active = true",
          [userEmail]
        ).catch(() => undefined);
      }

      const adminRows = await query<{ ok: number }>(
        "select 1 as ok from admin_users where email = $1 and is_active = true limit 1",
        [userEmail]
      );
      if (adminRows[0]?.ok) role = "admin";
    }

    const token = signToken({
      sub: String(user.id),
      email: user.email ?? undefined,
      role,
      name: user.name ?? undefined,
      phone: phoneE164,
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
