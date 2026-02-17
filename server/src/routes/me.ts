import { Router } from "express";

import { query } from "../lib/db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

export const meRouter = Router();

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

meRouter.post("/auth/logout", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    // Logout is handled by revoking the session in the auth middleware layer.
    // For now, the frontend can simply clear local storage.
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
