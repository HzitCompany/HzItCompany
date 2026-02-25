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

    let rows: any[] = [];
    if (keys.length) {
      try {
        rows = await query(
          "select key, value, updated_at from site_content where key = any($1) order by key asc",
          [keys]
        );
      } catch (dbErr: any) {
        // Gracefully handle missing table (schema not yet applied) — return empty list.
        const code = dbErr?.code ?? dbErr?.message ?? "";
        if (
          String(code).includes("42P01") || // undefined_table
          String(dbErr?.message ?? "").toLowerCase().includes("does not exist")
        ) {
          rows = [];
        } else {
          throw dbErr;
        }
      }
    }

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});
