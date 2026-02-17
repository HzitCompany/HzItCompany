import { Router } from "express";
import { z } from "zod";

import { query } from "../lib/db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { sendAdminSubmissionEmail, sendUserSubmissionEmail } from "../lib/email/resend.js";

export const submissionsRouter = Router();

const submissionTypeSchema = z.enum(["contact", "hire", "career"]);

const createSchema = z
  .object({
    type: submissionTypeSchema,
    data: z.record(z.string(), z.unknown()),
    honeypot: z.string().optional()
  })
  .strict();

submissionsRouter.post("/submissions", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized", true);
    if (req.user.provider !== "otp") throw new HttpError(403, "OTP login required", true);

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    // Honeypot: pretend success.
    if (parsed.data.honeypot && parsed.data.honeypot.trim().length > 0) {
      return res.json({ ok: true, ignored: true });
    }

    const userId = Number(req.user.sub);
    if (!Number.isFinite(userId)) throw new HttpError(401, "Unauthorized", true);

    // Rate limit: 5 submissions per hour per user.
    const recent = await query<{ count: string }>(
      "select count(*)::text as count from submissions where user_id = $1 and created_at > now() - interval '1 hour'",
      [userId]
    );

    const count = Number(recent[0]?.count ?? 0);
    if (count >= 5) throw new HttpError(429, "Too many submissions. Please try again later.", true);

    // Best-effort: if submission includes email/name, store it on user profile.
    const maybeEmail = typeof parsed.data.data.email === "string" ? parsed.data.data.email.trim().toLowerCase() : null;
    const maybeName = typeof parsed.data.data.name === "string" ? parsed.data.data.name.trim() : null;

    if (maybeEmail || maybeName) {
      await query(
        "update users set email = coalesce(email, $1), name = coalesce(name, $2) where id = $3",
        [maybeEmail || null, maybeName || null, userId]
      );
    }

    const inserted = await query<{ id: number; created_at: string }>(
      "insert into submissions (user_id, type, data) values ($1,$2,$3) returning id, created_at",
      [userId, parsed.data.type, parsed.data.data]
    );

    const createdId = inserted[0]?.id;
    const createdAt = inserted[0]?.created_at;
    const userEmail = maybeEmail ?? req.user.email ?? null;
    const userPhone = req.user.phone ?? null;

    void sendAdminSubmissionEmail({
      submissionType: parsed.data.type,
      submissionId: createdId,
      createdAt,
      userEmail,
      userPhone,
      data: parsed.data.data
    }).catch(() => undefined);

    if (userEmail) {
      void sendUserSubmissionEmail({ to: userEmail, submissionType: parsed.data.type }).catch(() => undefined);
    }

    return res.json({ ok: true, id: inserted[0]?.id, createdAt: inserted[0]?.created_at });
  } catch (err) {
    return next(err);
  }
});

submissionsRouter.get("/submissions", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized", true);
    if (req.user.provider !== "otp") throw new HttpError(403, "OTP login required", true);

    const userId = Number(req.user.sub);
    if (!Number.isFinite(userId)) throw new HttpError(401, "Unauthorized", true);

    const rows = await query<{ id: number; created_at: string; type: string; data: unknown }>(
      "select id, created_at, type, data from submissions where user_id = $1 order by created_at desc limit 200",
      [userId]
    );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});
