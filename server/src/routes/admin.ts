import { Router } from "express";
import { z } from "zod";

import { query } from "../lib/db.js";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getResumesBucketId, getSupabaseAdmin } from "../lib/supabase.js";

export const adminRouter = Router();

const submissionsTypeSchema = z.enum(["contact", "hire", "career"]);

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
        "select s.id, s.created_at, s.type, s.data, u.email as user_email, u.phone as user_phone",
        "from submissions s",
        "join users u on u.id = s.user_id",
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

adminRouter.get("/admin/content", requireAuth, requireAdmin, async (_req: AuthedRequest, res, next) => {
  try {
    const rows = await query("select key, value, updated_at from site_content order by key asc");
    return res.json({ ok: true, items: rows });
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

adminRouter.get("/admin/careers", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status : undefined;
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 200;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 200;

    const parsedStatus = statusRaw ? careerStatusSchema.safeParse(statusRaw) : { success: true as const, data: undefined };
    if (!parsedStatus.success) return res.status(400).json({ ok: false, error: "Invalid status" });

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
