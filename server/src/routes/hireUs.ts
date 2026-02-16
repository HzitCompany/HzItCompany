import { Router } from "express";
import { hireRequestSchema } from "./schemas.js";
import { insertHireRequest } from "../lib/db.js";

export const hireUsRoutes = Router();

hireUsRoutes.post("/", async (req, res) => {
  try {
    const parsed = hireRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    await insertHireRequest(parsed.data);

    return res.json({ success: true });
  } catch (_err) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
