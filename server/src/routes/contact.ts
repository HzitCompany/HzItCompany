import { Router } from "express";
import { contactMessageSchema } from "./schemas.js";
import { insertContactMessage } from "../lib/db.js";

export const contactRoutes = Router();

contactRoutes.post("/", async (req, res) => {
  try {
    const parsed = contactMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    await insertContactMessage(parsed.data);

    return res.json({ success: true });
  } catch (_err) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
