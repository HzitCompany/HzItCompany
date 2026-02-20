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

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    // Honeypot: pretend success.
    if (parsed.data.honeypot && parsed.data.honeypot.trim().length > 0) {
      return res.json({ ok: true, ignored: true });
    }

    const userId = req.user.sub;

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

    const supabaseUid = req.user.id; // Supabase auth UUID — unambiguous per user

    const inserted = await query<{ id: number; created_at: string }>(
      "insert into submissions (user_id, supabase_uid, type, data) values ($1,$2,$3,$4) returning id, created_at",
      [userId, supabaseUid, parsed.data.type, parsed.data.data]
    );

    const createdId = inserted[0]?.id;
    const createdAt = inserted[0]?.created_at;
    const userEmail = maybeEmail ?? req.user.email ?? null;
    const userPhone: string | null = null;

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

    // Prefer filtering by supabase_uid (Supabase auth UUID) — unambiguous, set on all new
    // submissions. Fall back to user_id for any legacy rows that pre-date the uid column.
    const supabaseUid = req.user.id;
    const userId = req.user.sub;

    const rows = await query<{
      id: number;
      created_at: string;
      type: string;
      data: unknown;
      status: string | null;
    }>(
      [
        "select s.id, s.created_at, s.type, s.data,",
        "       coalesce(ca.status, s.data ->> 'adminStatus') as status",
        "from submissions s",
        "left join career_applications ca on ca.submission_id = s.id",
        "where (s.supabase_uid = $1 or (s.supabase_uid is null and s.user_id = $2))",
        "order by s.created_at desc",
        "limit 200"
      ].join("\n"),
      [supabaseUid, userId]
    );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

// Allow a user to update the data of their own submission (only if not yet reviewed).
submissionsRouter.patch("/submissions/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized", true);

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) throw new HttpError(400, "Invalid submission ID", true);

    const { data } = req.body as { data?: Record<string, unknown> };
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new HttpError(400, "Invalid data payload", true);
    }

    const supabaseUid = req.user.id;
    const userId = req.user.sub;

    // Only allow editing own submissions that haven't been reviewed yet.
    const result = await query<{ id: number }>(
      `update submissions
       set data = data || $1::jsonb
       where id = $2
         and (supabase_uid = $3 or (supabase_uid is null and user_id = $4))
         and coalesce(data->>'adminStatus', 'new') = 'new'
       returning id`,
      [JSON.stringify(data), id, supabaseUid, userId]
    );

    if (!result[0]) {
      throw new HttpError(404, "Submission not found or already under review (cannot edit)", true);
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
