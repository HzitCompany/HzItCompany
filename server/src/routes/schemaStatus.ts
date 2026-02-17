import { Router } from "express";

import { getSchemaStatus } from "../lib/schema.js";

export const schemaStatusRouter = Router();

// Public, read-only endpoint to help diagnose production deployments.
// Does not expose any sensitive values; only reports which core tables exist.
schemaStatusRouter.get("/", async (_req, res, next) => {
  try {
    const status = await getSchemaStatus();
    if (status.ok) return res.json({ ok: true, missing: [] as string[] });
    return res.status(503).json({ ok: false, missing: status.missing });
  } catch (err) {
    return next(err);
  }
});
