import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";

import { env } from "../lib/env.js";
import { query } from "../lib/db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getResumesBucketId, getSupabaseAdmin } from "../lib/supabase.js";

export const careersRouter = Router();

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

function fileExtensionForMime(mime: string) {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    default:
      return undefined;
  }
}

function safeBaseName(input: string) {
  const base = input.split("/").pop()?.split("\\").pop() ?? "file";
  const noExt = base.replace(/\.[^.]+$/, "");
  const cleaned = noExt
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return cleaned || "file";
}

const createUploadUrlSchema = z
  .object({
    kind: z.enum(["resume", "cv"]),
    fileName: z.string().min(1).max(200),
    fileType: z.string().min(1).max(120),
    fileSize: z.number().int().positive()
  })
  .strict();

careersRouter.post("/upload-url", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = createUploadUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) throw new HttpError(401, "Unauthorized", true);

    const { fileName, fileType, fileSize, kind } = parsed.data;

    if (!allowedMimeTypes.has(fileType)) {
      throw new HttpError(400, "Unsupported file type. Upload PDF, DOC, or DOCX.", true);
    }

    if (fileSize > env.CAREER_UPLOAD_MAX_BYTES) {
      throw new HttpError(400, `File too large. Max size is ${Math.floor(env.CAREER_UPLOAD_MAX_BYTES / (1024 * 1024))}MB.`, true);
    }

    const ext = fileExtensionForMime(fileType);
    if (!ext) throw new HttpError(400, "Unsupported file type.", true);

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");

    const rand = crypto.randomBytes(12).toString("hex");
    const base = safeBaseName(fileName);

    const path = `career/${userId}/${yyyy}-${mm}-${dd}/${kind}-${base}-${rand}.${ext}`;

    const supabase = getSupabaseAdmin();
    const bucket = getResumesBucketId();

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) {
      throw new HttpError(502, "Failed to create upload URL. Check Supabase Storage configuration.", true);
    }

    return res.json({ ok: true, bucket, path: data.path, token: data.token, signedUrl: data.signedUrl });
  } catch (err) {
    return next(err);
  }
});

const applySchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().max(254),
    phone: z.string().min(8).max(20),
    position: z.string().min(2).max(120),
    message: z.string().max(5000).optional(),

    experience: z.string().max(120).optional(),
    portfolioUrl: z.string().url().max(500).optional(),

    resumePath: z.string().max(800).optional(),
    cvPath: z.string().max(800).optional(),

    honeypot: z.string().max(200).optional()
  })
  .strict();

careersRouter.post("/apply", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) throw new HttpError(401, "Unauthorized", true);

    // Quietly accept honeypot submissions.
    if (parsed.data.honeypot && parsed.data.honeypot.trim().length > 0) {
      return res.json({ ok: true });
    }

    const email = parsed.data.email.toLowerCase();

    // Ensure uploaded paths (if present) are scoped to this user.
    const allowedPrefix = `career/${userId}/`;
    if (parsed.data.resumePath && !parsed.data.resumePath.startsWith(allowedPrefix)) {
      throw new HttpError(400, "Invalid resume upload path", true);
    }
    if (parsed.data.cvPath && !parsed.data.cvPath.startsWith(allowedPrefix)) {
      throw new HttpError(400, "Invalid CV upload path", true);
    }

    await query(
      "update users set email = coalesce(email, $1), name = coalesce(name, $2) where id = $3",
      [email, parsed.data.fullName, userId]
    );

    const submissionData = {
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone,
      position: parsed.data.position,
      message: parsed.data.message ?? null,
      experience: parsed.data.experience ?? null,
      portfolioUrl: parsed.data.portfolioUrl ?? null,
      resumePath: parsed.data.resumePath ?? null,
      cvPath: parsed.data.cvPath ?? null
    };

    const submissionRows = await query<{ id: number }>(
      "insert into submissions (user_id, type, data) values ($1,'career',$2) returning id",
      [userId, submissionData]
    );

    const submissionId = submissionRows[0]?.id;

    const appRows = await query<{ id: number }>(
      [
        "insert into career_applications (user_id, submission_id, full_name, email, phone, position, message, resume_path, cv_path, status, metadata)",
        "values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'new',$10)",
        "returning id"
      ].join("\n"),
      [
        userId,
        submissionId ?? null,
        parsed.data.fullName,
        email,
        parsed.data.phone,
        parsed.data.position,
        parsed.data.message ?? null,
        parsed.data.resumePath ?? null,
        parsed.data.cvPath ?? null,
        {
          experience: parsed.data.experience ?? null,
          portfolioUrl: parsed.data.portfolioUrl ?? null
        }
      ]
    );

    const applicationId = appRows[0]?.id;

    // Back-link application id into the submission for unified admin views.
    if (submissionId && applicationId) {
      await query(
        "update submissions set data = jsonb_set(data, '{applicationId}', to_jsonb($1::bigint), true) where id = $2",
        [applicationId, submissionId]
      ).catch(() => undefined);
    }

    return res.json({ ok: true, id: applicationId });
  } catch (err) {
    return next(err);
  }
});
