import express from "express";
import { z } from "zod";

import { query } from "../lib/db.js";

export const contentRouter = express.Router();

const getContentQuerySchema = z
  .object({
    keys: z.string().optional()
  })
  .strict();

// Public: GET /api/content?keys=page.home,page.about
// Returns site_content rows for the requested keys (or an empty list).
contentRouter.get("/", async (req, res, next) => {
  try {
    const parsed = getContentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid query", details: parsed.error.flatten() });
    }

    const keysRaw = parsed.data.keys?.trim();
    const keys = keysRaw
      ? keysRaw
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 50)
      : [];

    const rows = keys.length
      ? await query(
          "select key, value, updated_at from site_content where key = any($1) order by key asc",
          [keys]
        )
      : [];

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});
