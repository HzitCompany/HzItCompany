import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { env } from "../lib/env.js";
import { query } from "../lib/db.js";
import { generateOtp6, makeOtpHash, randomSalt } from "../lib/otp.js";
import { normalizeIndianPhoneE164, sendOtpSmsMsg91 } from "../lib/sms/msg91.js";
import { sendOtpEmail } from "../lib/email/resend.js";
import { HttpError } from "../middleware/errorHandler.js";
import { signToken } from "../lib/auth.js";
import { createOtpSession } from "../lib/sessions.js";

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

    const otp = generateOtp6();
    const salt = randomSalt(16);
    const otpHash = makeOtpHash(otp, salt);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_SECONDS * 1000);

    await query(
      "insert into otp_codes (user_id, channel, destination, otp_hash, otp_salt, expires_at) values ($1,'sms',$2,$3,$4,$5)",
      [userId, phoneE164, otpHash, salt, expiresAt.toISOString()]
    );

    // Dev fallback: if we're not in production, allow returning OTP when explicitly enabled,
    // or when the SMS provider is not configured.
    if (env.NODE_ENV !== "production") {
      if (env.OTP_DEBUG_RETURN || !env.MSG91_AUTH_KEY) {
        return res.json({
          ok: true,
          debugOtp: otp,
          expiresInSeconds: env.OTP_EXPIRES_SECONDS,
          providerConfigured: Boolean(env.MSG91_AUTH_KEY)
        });
      }
    }

    await sendOtpSmsMsg91({ phone: phoneE164, otp });

    return res.json({ ok: true });
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

    const userRows = await query<{ id: number; email: string | null; name: string | null; is_verified: boolean }>(
      "select id, email, name, is_verified from users where phone = $1 limit 1",
      [phoneE164]
    );

    const user = userRows[0];
    if (!user) throw new HttpError(404, "User not found", true);

    const codeRows = await query<{ id: number; otp_hash: string; otp_salt: string; expires_at: string; consumed_at: string | null }>(
      "select id, otp_hash, otp_salt, expires_at, consumed_at from otp_codes where user_id = $1 and channel = 'sms' order by created_at desc limit 1",
      [user.id]
    );

    const code = codeRows[0];
    if (!code) throw new HttpError(400, "OTP not requested", true);
    if (code.consumed_at) throw new HttpError(400, "OTP already used", true);

    const expiresAtMs = new Date(code.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
      throw new HttpError(400, "OTP expired", true);
    }

    const expected = makeOtpHash(parsed.data.otp, code.otp_salt);
    if (expected !== code.otp_hash) throw new HttpError(400, "Invalid OTP", true);

    await query("update otp_codes set consumed_at = now() where id = $1", [code.id]);
    await query("update users set is_verified = true where id = $1", [user.id]);

    const role =
      env.ADMIN_EMAIL && user.email && user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()
        ? "admin"
        : "client";

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

// Combined verification: require both SMS OTP and Email OTP.
const requestBothSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().max(254),
    phone: z.string().min(8).max(20)
  })
  .strict();

otpRouter.post("/request-both", async (req, res, next) => {
  try {
    const parsed = requestBothSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const phoneE164 = normalizeIndianPhoneE164(parsed.data.phone);
    const email = parsed.data.email.toLowerCase();

    // Create/find user by phone, fallback to email.
    let userId: number | undefined;

    const byPhone = await query<{ id: number }>("select id from users where phone = $1 limit 1", [phoneE164]);
    userId = byPhone[0]?.id;

    if (!userId) {
      const byEmail = await query<{ id: number }>("select id from users where email = $1 limit 1", [email]);
      userId = byEmail[0]?.id;
      if (userId) {
        await query("update users set phone = coalesce(phone, $1) where id = $2", [phoneE164, userId]);
      }
    }

    if (!userId) {
      const created = await query<{ id: number }>(
        "insert into users (name, email, phone, is_verified) values ($1,$2,$3,false) returning id",
        [parsed.data.name ?? null, email, phoneE164]
      );
      userId = created[0]?.id;
    } else {
      await query(
        "update users set email = coalesce(email, $1), name = coalesce(name, $2) where id = $3",
        [email, parsed.data.name ?? null, userId]
      );
    }

    if (!userId) throw new HttpError(500, "Failed to create user");

    const smsOtp = generateOtp6();
    const smsSalt = randomSalt(16);
    const smsHash = makeOtpHash(smsOtp, smsSalt);

    const emailOtp = generateOtp6();
    const emailSalt = randomSalt(16);
    const emailHash = makeOtpHash(emailOtp, emailSalt);

    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_SECONDS * 1000);

    await query(
      "insert into otp_codes (user_id, channel, destination, otp_hash, otp_salt, expires_at) values ($1,'sms',$2,$3,$4,$5)",
      [userId, phoneE164, smsHash, smsSalt, expiresAt.toISOString()]
    );

    await query(
      "insert into otp_codes (user_id, channel, destination, otp_hash, otp_salt, expires_at) values ($1,'email',$2,$3,$4,$5)",
      [userId, email, emailHash, emailSalt, expiresAt.toISOString()]
    );

    if (env.NODE_ENV !== "production" && (env.OTP_DEBUG_RETURN || !env.MSG91_AUTH_KEY || !env.RESEND_API_KEY)) {
      return res.json({
        ok: true,
        debug: { smsOtp, emailOtp },
        expiresInSeconds: env.OTP_EXPIRES_SECONDS
      });
    }

    await Promise.all([
      sendOtpSmsMsg91({ phone: phoneE164, otp: smsOtp }),
      sendOtpEmail({ to: email, otp: emailOtp, expiresInSeconds: env.OTP_EXPIRES_SECONDS })
    ]);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

const verifyBothSchema = z
  .object({
    phone: z.string().min(8).max(20),
    email: z.string().email().max(254),
    smsOtp: z.string().regex(/^\d{6}$/),
    emailOtp: z.string().regex(/^\d{6}$/)
  })
  .strict();

otpRouter.post("/verify-both", async (req, res, next) => {
  try {
    const parsed = verifyBothSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const phoneE164 = normalizeIndianPhoneE164(parsed.data.phone);
    const email = parsed.data.email.toLowerCase();

    const userRows = await query<{ id: number; email: string | null; name: string | null; is_verified: boolean }>(
      "select id, email, name, is_verified from users where phone = $1 limit 1",
      [phoneE164]
    );

    const user = userRows[0];
    if (!user) throw new HttpError(404, "User not found", true);

    // Ensure email matches user (or set it if missing)
    if (user.email && user.email.toLowerCase() !== email) {
      throw new HttpError(400, "Email does not match this phone", true);
    }
    if (!user.email) {
      await query("update users set email = $1 where id = $2", [email, user.id]);
    }

    const smsRows = await query<{ id: number; otp_hash: string; otp_salt: string; expires_at: string; consumed_at: string | null }>(
      "select id, otp_hash, otp_salt, expires_at, consumed_at from otp_codes where user_id = $1 and channel = 'sms' order by created_at desc limit 1",
      [user.id]
    );
    const emailRows = await query<{ id: number; otp_hash: string; otp_salt: string; expires_at: string; consumed_at: string | null }>(
      "select id, otp_hash, otp_salt, expires_at, consumed_at from otp_codes where user_id = $1 and channel = 'email' order by created_at desc limit 1",
      [user.id]
    );

    const smsCode = smsRows[0];
    const emailCode = emailRows[0];
    if (!smsCode || !emailCode) throw new HttpError(400, "OTP not requested", true);
    if (smsCode.consumed_at || emailCode.consumed_at) throw new HttpError(400, "OTP already used", true);

    const smsExpires = new Date(smsCode.expires_at).getTime();
    const emailExpires = new Date(emailCode.expires_at).getTime();
    if (!Number.isFinite(smsExpires) || Date.now() > smsExpires) throw new HttpError(400, "SMS OTP expired", true);
    if (!Number.isFinite(emailExpires) || Date.now() > emailExpires) throw new HttpError(400, "Email OTP expired", true);

    const expectedSms = makeOtpHash(parsed.data.smsOtp, smsCode.otp_salt);
    if (expectedSms !== smsCode.otp_hash) throw new HttpError(400, "Invalid SMS OTP", true);

    const expectedEmail = makeOtpHash(parsed.data.emailOtp, emailCode.otp_salt);
    if (expectedEmail !== emailCode.otp_hash) throw new HttpError(400, "Invalid Email OTP", true);

    await query("update otp_codes set consumed_at = now() where id = $1", [smsCode.id]);
    await query("update otp_codes set consumed_at = now() where id = $1", [emailCode.id]);
    await query("update users set is_verified = true where id = $1", [user.id]);

    const role = env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() ? "admin" : "client";

    const token = signToken({
      sub: String(user.id),
      email,
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
