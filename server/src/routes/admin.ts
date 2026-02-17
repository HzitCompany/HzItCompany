import { Router } from "express";
import { z } from "zod";

import { query } from "../lib/db.js";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";

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
