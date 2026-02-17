import { Router } from "express";
import { z } from "zod";

import { query } from "../lib/db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

export const meRouter = Router();

const updateMeSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().max(254).optional()
  })
  .strict();

meRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized", true);

    if (req.user.provider !== "otp") {
      // Legacy tokens (password-based portal/admin) don't map 1:1 to the OTP user table.
      return res.json({
        ok: true,
        user: {
          id: req.user.sub,
          name: req.user.name ?? null,
          email: req.user.email ?? null,
          phone: null,
          isVerified: true,
          provider: "password" as const,
          role: req.user.role
        }
      });
    }

    const userId = Number(req.user.sub);
    if (!Number.isFinite(userId)) throw new HttpError(401, "Unauthorized", true);

    const rows = await query<{ id: number; created_at: string; name: string | null; email: string | null; phone: string | null; is_verified: boolean }>(
      "select id, created_at, name, email, phone, is_verified from users where id = $1 limit 1",
      [userId]
    );

    const u = rows[0];
    if (!u) throw new HttpError(401, "Unauthorized", true);

    return res.json({
      ok: true,
      user: {
        id: String(u.id),
        name: u.name,
        email: u.email,
        phone: u.phone,
        isVerified: u.is_verified,
        provider: "otp" as const,
        role: req.user.role
      }
    });
  } catch (err) {
    return next(err);
  }
});

meRouter.patch("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized", true);
    if (req.user.provider !== "otp") {
      throw new HttpError(400, "Profile editing is only supported for OTP accounts.", true);
    }

    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const userId = Number(req.user.sub);
    if (!Number.isFinite(userId)) throw new HttpError(401, "Unauthorized", true);

    const nextName = typeof parsed.data.name === "string" ? parsed.data.name.trim() : undefined;
    const nextEmail = typeof parsed.data.email === "string" ? parsed.data.email.trim().toLowerCase() : undefined;

    if (!nextName && !nextEmail) {
      throw new HttpError(400, "Nothing to update", true);
    }

    const rows = await query<{ id: number; created_at: string; name: string | null; email: string | null; phone: string | null; is_verified: boolean }>(
      "update users set name = coalesce($1, name), email = coalesce($2, email) where id = $3 returning id, created_at, name, email, phone, is_verified",
      [nextName ?? null, nextEmail ?? null, userId]
    );

    const u = rows[0];
    if (!u) throw new HttpError(401, "Unauthorized", true);

    return res.json({
      ok: true,
      user: {
        id: String(u.id),
        name: u.name,
        email: u.email,
        phone: u.phone,
        isVerified: u.is_verified,
        provider: "otp" as const,
        role: req.user.role
      }
    });
  } catch (err) {
    return next(err);
  }
});

meRouter.post("/auth/logout", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    // Logout is handled by revoking the session in the auth middleware layer.
    // For now, the frontend can simply clear local storage.
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
