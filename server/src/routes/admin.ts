import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";

import { env } from "../lib/env.js";
import { query } from "../lib/db.js";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getResumesBucketId, getSupabaseAdmin } from "../lib/supabase.js";

export const adminRouter = Router();

// ── Analytics / Stats ──────────────────────────────────────────────────────────
adminRouter.get("/admin/analytics", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    async function safeCount(sql: string, params: unknown[] = []): Promise<number> {
      try {
        const rows = await query<{ n: string }>(sql, params);
        return Number(rows[0]?.n ?? 0);
      } catch {
        return 0;
      }
    }

    const [
      totalUsers,
      totalSessions,
      resumeUploads,
      contactSubmissions,
      hireSubmissions,
    ] = await Promise.all([
      safeCount("select count(*) as n from profiles"), // Step 7: Use profiles count
      safeCount("select count(*) as n from auth.sessions"), // if accessible, or just 0 for now as Supabase manages sessions
      safeCount("select count(*) as n from career_applications where resume_path is not null"),
      safeCount("select count(*) as n from submissions where type = 'contact'"),
      safeCount("select count(*) as n from submissions where type = 'hire'"),
    ]);

    return res.json({
      ok: true,
      analytics: {
        totalUsers,
        activeSessions: 0, // Supabase handles sessions
        resumeUploads,
        contactSubmissions,
        hireSubmissions,
      }
    });
  } catch (err) {
    return next(err);
  }
});

// ── Summary (existing endpoint kept for backwards compatibility) ────────────────
const submissionsTypeSchema = z.enum(["contact", "hire", "career"]);
const submissionStatusSchema = z.enum(["new", "reviewing", "shortlisted", "rejected", "hired"]);

adminRouter.get("/admin/submissions", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 200;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 200;

    const parsedType = type ? submissionsTypeSchema.safeParse(type) : { success: true as const, data: undefined };
    if (!parsedType.success) {
      return res.status(400).json({ ok: false, error: "Invalid type" });
    }

    const rows = await query(
      [
        "select s.id, s.created_at, s.type, s.data,",
        "       coalesce(ca.status, s.data ->> 'adminStatus') as status,",
        "       coalesce(s.data ->> 'email', u.email) as user_email,",
        "       coalesce(s.data ->> 'phone', u.phone) as user_phone",
        "from submissions s",
        "left join career_applications ca on ca.submission_id = s.id",
        "left join users u on u.id = s.user_id",
        "where ($1::text is null or s.type = $1)",
        "and ($2::text = '' or s.data::text ilike ('%' || $2 || '%') or coalesce(u.email,'') ilike ('%' || $2 || '%') or coalesce(u.phone,'') ilike ('%' || $2 || '%'))",
        "order by s.created_at desc",
        "limit $3"
      ].join("\n"),
      [parsedType.data ?? null, q, limit]
    );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

const updateSubmissionStatusSchema = z
  .object({
    status: submissionStatusSchema
  })
  .strict();

adminRouter.patch("/admin/submissions/:id/status", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

    const parsed = updateSubmissionStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }

    const found = await query<{ id: number; type: "contact" | "hire" | "career" }>(
      "select id, type from submissions where id = $1 limit 1",
      [id]
    );
    const submission = found[0];
    if (!submission?.id) return res.status(404).json({ ok: false, error: "Not found" });

    if (submission.type === "career") {
      const updatedCareer = await query<{ id: number }>(
        "update career_applications set status = $2 where submission_id = $1 returning id",
        [id, parsed.data.status]
      );
      if (!updatedCareer[0]?.id) {
        return res.status(404).json({ ok: false, error: "Career application not found" });
      }
      return res.json({ ok: true });
    }

    const updated = await query<{ id: number }>(
      [
        "update submissions",
        "set data = jsonb_set(coalesce(data, '{}'::jsonb), '{adminStatus}', to_jsonb($2::text), true)",
        "where id = $1 and type in ('contact','hire')",
        "returning id"
      ].join("\n"),
      [id, parsed.data.status]
    );

    if (!updated[0]?.id) return res.status(404).json({ ok: false, error: "Not found" });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

adminRouter.delete("/admin/submissions/:id", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

    const deleted = await query<{ id: number }>("delete from submissions where id = $1 returning id", [id]);
    if (!deleted[0]?.id) return res.status(404).json({ ok: false, error: "Not found" });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/admin/leads/contact", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    const rows = await query(
      "select id, created_at, name, email, phone, subject from contact_submissions order by created_at desc limit 200"
    );
    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

// Alias (spec): GET /api/admin/contact
adminRouter.get("/admin/contact", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    const rows = await query(
      "select id, created_at, name, email, phone, subject from contact_submissions order by created_at desc limit 200"
    );
    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/admin/leads/hire", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    const rows = await query(
      "select id, created_at, name, email, phone, company, project_name, budget, timeline from hire_us_submissions order by created_at desc limit 200"
    );
    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

// Alias (spec): GET /api/admin/hire
adminRouter.get("/admin/hire", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    const rows = await query(
      "select id, created_at, name, email, phone, company, project_name, budget, timeline from hire_us_submissions order by created_at desc limit 200"
    );
    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/admin/content", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    const rows = await query("select key, value, updated_at from site_content order by key asc");
    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

const createAssetUploadUrlSchema = z
  .object({
    fileName: z.string().min(1).max(200),
    fileType: z.string().min(1).max(120),
    fileSize: z.number().int().positive()
  })
  .strict();

const allowedImageMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml"
]);

function imageExtensionForMime(mime: string) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
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

function publicObjectUrl(baseUrl: string, bucket: string, path: string) {
  const normalized = baseUrl.replace(/\/$/, "");
  const encodedPath = path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `${normalized}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

// POST /api/admin/assets/upload-url
// Creates a signed upload URL into a *public* storage bucket for CMS images.
adminRouter.post("/admin/assets/upload-url", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = createAssetUploadUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const userId = req.user?.sub;
    if (!Number.isFinite(userId)) throw new HttpError(401, "Unauthorized", true);

    const { fileName, fileType, fileSize } = parsed.data;

    if (!allowedImageMimeTypes.has(fileType)) {
      throw new HttpError(400, "Unsupported image type. Upload PNG, JPG, WEBP, GIF, or SVG.", true);
    }

    if (fileSize > env.CAREER_UPLOAD_MAX_BYTES) {
      throw new HttpError(400, `File too large. Max size is ${Math.floor(env.CAREER_UPLOAD_MAX_BYTES / (1024 * 1024))}MB.`, true);
    }

    const ext = imageExtensionForMime(fileType);
    if (!ext) throw new HttpError(400, "Unsupported image type.", true);

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");

    const rand = crypto.randomBytes(12).toString("hex");
    const base = safeBaseName(fileName);

    const bucket = env.SUPABASE_PUBLIC_BUCKET || "site-assets";
    const path = `cms/${userId}/${yyyy}-${mm}-${dd}/img-${base}-${rand}.${ext}`;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data?.path) {
      throw new HttpError(502, "Failed to create upload URL. Check Supabase Storage configuration.", true);
    }

    if (!env.SUPABASE_URL) {
      throw new HttpError(503, "Supabase Storage is not configured. Set SUPABASE_URL on the backend.", true);
    }

    return res.json({
      ok: true,
      bucket,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicObjectUrl(env.SUPABASE_URL, bucket, data.path)
    });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/admin/pricing", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    const rows = await query(
      [
        "select id, created_at, updated_at, service_key, service_name, plan_key, plan_name, price_inr, is_active, sort_order",
        "from services_pricing",
        "order by sort_order asc, service_key asc, plan_key asc"
      ].join("\n")
    );
    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

const upsertPricingSchema = z
  .object({
    serviceKey: z.string().min(1).max(120),
    serviceName: z.string().min(1).max(200),
    planKey: z.string().min(1).max(120),
    planName: z.string().min(1).max(200),
    priceInr: z.number().int().positive(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional()
  })
  .strict();

adminRouter.post("/admin/pricing", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = upsertPricingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const input = parsed.data;
    const rows = await query<{ id: number }>(
      [
        "insert into services_pricing (service_key, service_name, plan_key, plan_name, price_inr, is_active, sort_order)",
        "values ($1,$2,$3,$4,$5,$6,$7)",
        "on conflict (service_key, plan_key) do update set",
        "service_name = excluded.service_name,",
        "plan_name = excluded.plan_name,",
        "price_inr = excluded.price_inr,",
        "is_active = excluded.is_active,",
        "sort_order = excluded.sort_order,",
        "updated_at = now()",
        "returning id"
      ].join("\n"),
      [
        input.serviceKey,
        input.serviceName,
        input.planKey,
        input.planName,
        input.priceInr,
        input.isActive ?? true,
        input.sortOrder ?? 0
      ]
    );

    return res.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    return next(err);
  }
});

const upsertContentSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.unknown()
});

adminRouter.put("/admin/content", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = upsertContentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    await query(
      "insert into site_content (key, value) values ($1,$2) on conflict (key) do update set value = excluded.value, updated_at = now()",
      [parsed.data.key, parsed.data.value]
    );

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

const careerStatusSchema = z.enum(["new", "reviewing", "shortlisted", "rejected", "hired"]);

adminRouter.get("/admin/otp", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 200;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 200;

    const rows = await query(
      [
        "select o.id, o.created_at, o.user_id, o.channel, o.destination, o.expires_at, o.consumed_at,",
        "u.email as user_email, u.phone as user_phone",
        "from otp_codes o",
        "join users u on u.id = o.user_id",
        "order by o.created_at desc",
        "limit $1"
      ].join("\n"),
      [limit]
    );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/admin/careers", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status : undefined;
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 200;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 200;

    const parsedStatus = statusRaw ? careerStatusSchema.safeParse(statusRaw) : { success: true as const, data: undefined };
    if (!parsedStatus.success) return res.status(400).json({ ok: false, error: "Invalid status" });

    try {
      const rows = await query(
        [
          "select id, created_at, user_id, submission_id, full_name, email, phone, position, message, resume_path, cv_path, status, metadata",
          "from career_applications",
          "where ($1::text is null or status = $1)",
          "and ($2::text = '' or full_name ilike ('%' || $2 || '%') or email ilike ('%' || $2 || '%') or phone ilike ('%' || $2 || '%') or position ilike ('%' || $2 || '%'))",
          "order by created_at desc",
          "limit $3"
        ].join("\n"),
        [parsedStatus.data ?? null, q, limit]
      );

      return res.json({ ok: true, items: rows });
    } catch (err: any) {
      if (err?.code !== "42P01") throw err;

      const rows = await query(
        [
          "select id, created_at, null::bigint as user_id, null::bigint as submission_id, name as full_name, email, phone, position, null::text as message, resume_url as resume_path, null::text as cv_path, 'new'::text as status, '{}'::jsonb as metadata",
          "from careers",
          "where ($1::text = '' or name ilike ('%' || $1 || '%') or email ilike ('%' || $1 || '%') or coalesce(phone,'') ilike ('%' || $1 || '%') or coalesce(position,'') ilike ('%' || $1 || '%'))",
          "order by created_at desc",
          "limit $2"
        ].join("\n"),
        [q, limit]
      );

      return res.json({ ok: true, items: rows });
    }
  } catch (err) {
    return next(err);
  }
});

const updateCareerStatusSchema = z.object({ status: careerStatusSchema }).strict();

adminRouter.patch("/admin/careers/:id", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

    const parsed = updateCareerStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const rows = await query<{ id: number }>(
      "update career_applications set status = $2 where id = $1 returning id",
      [id, parsed.data.status]
    );

    if (!rows[0]?.id) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

const downloadUrlQuerySchema = z
  .object({
    kind: z.enum(["resume", "cv"]),
    expiresInSeconds: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
        z.number().int().positive().max(3600).optional()
      )
  })
  .strict();

adminRouter.get("/admin/careers/:id/download-url", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

    const parsed = downloadUrlQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const expiresInSeconds = parsed.data.expiresInSeconds ?? 600;

    const rows = await query<{ resume_path: string | null; cv_path: string | null }>(
      "select resume_path, cv_path from career_applications where id = $1 limit 1",
      [id]
    );

    const record = rows[0];
    if (!record) return res.status(404).json({ ok: false, error: "Not found" });

    const path = parsed.data.kind === "resume" ? record.resume_path : record.cv_path;
    if (!path) return res.status(404).json({ ok: false, error: "File not available" });

    const supabase = getSupabaseAdmin();
    const bucket = getResumesBucketId();

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new HttpError(502, "Failed to create signed URL. Check Supabase Storage configuration.", true);
    }

    return res.json({ ok: true, url: data.signedUrl, expiresInSeconds });
  } catch (err) {
    return next(err);
  }
});

const resumesDownloadUrlSchema = z
  .object({
    kind: z.enum(["resume", "cv"]).optional(),
    path: z.string().min(1).max(800),
    expiresInSeconds: z.number().int().positive().max(3600).optional()
  })
  .strict();

// POST /api/admin/resumes/download-url
// Creates a signed download URL for an object in the resumes bucket.
// Intended for legacy submission records that only store storage paths.
adminRouter.post("/admin/resumes/download-url", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = resumesDownloadUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const expiresInSeconds = parsed.data.expiresInSeconds ?? 600;
    const path = parsed.data.path;

    // Basic guard against signing arbitrary objects.
    // Career uploads use the `career/` prefix.
    if (!path.startsWith("career/")) {
      return res.status(400).json({ ok: false, error: "Invalid path" });
    }

    const supabase = getSupabaseAdmin();
    const bucket = getResumesBucketId();

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new HttpError(502, "Failed to create signed URL. Check Supabase Storage configuration.", true);
    }

    return res.json({ ok: true, url: data.signedUrl, expiresInSeconds });
  } catch (err) {
    return next(err);
  }
});

// ── User Management ──────────────────────────────────────────────────────────

// GET /admin/users
adminRouter.get("/admin/users", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    // Fetch profiles with pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data: profiles, error, count } = await supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ ok: true, items: profiles, total: count });
  } catch (err) {
    return next(err);
  }
});

// PATCH /admin/users/:id/role
adminRouter.patch("/admin/users/:id/role", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
       return res.status(400).json({ ok: false, error: "Invalid role" });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);

    if (error) throw error;

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/stats (Alias to analytics)
adminRouter.get("/admin/stats", requireAuth, requireAdmin, async (req, res, next) => {
    // Reuse the logic from /admin/analytics or redirect internally
    // reusing the handler logic for simplicity:
    try {
        const supabase = getSupabaseAdmin();
        const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        
        // Count other stats if needed for the dashboard cards
        const contactSubmissions = (await query<{n:string}>("select count(*) as n from submissions where type = 'contact'"))[0]?.n || 0;
        const hireSubmissions = (await query<{n:string}>("select count(*) as n from submissions where type = 'hire'"))[0]?.n || 0;
        const careerApplications = (await query<{n:string}>("select count(*) as n from career_applications"))[0]?.n || 0;

        return res.json({
            ok: true,
            stats: {
                totalUsers,
                contactSubmissions: Number(contactSubmissions),
                hireSubmissions: Number(hireSubmissions),
                careerApplications: Number(careerApplications)
            }
        });
    } catch (err) {
        next(err);
    }
});
