import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import { env } from "../lib/env.js";

export const authRouter = Router();

// Schema for manual profile sync if needed
const syncProfileSchema = z.object({
  full_name: z.string().optional()
});

// Endpoint to ensure backend has the profile synced
// This is idempotent. Frontend calls this after login/signup success.
authRouter.post("/auth/sync-profile", async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  
  if (!token) return next(new HttpError(401, "Unauthorized"));

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) throw new HttpError(401, "Invalid token");

    const parsed = syncProfileSchema.safeParse(req.body);
    const fullName = parsed.success ? parsed.data.full_name : (user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
    const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
    const role = adminEmail && user.email?.trim().toLowerCase() === adminEmail ? "admin" : "user";

    // Upsert profile
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: role
      }, { onConflict: "id" });

    if (upsertError) {
      // Log error but maybe don't fail the request if it's just a duplicate key issue that wasn't caught
      console.error("Profile sync error:", upsertError);
      throw new HttpError(500, "Failed to sync profile");
    }

    return res.json({ ok: true, role });
  } catch (err) {
    next(err);
  }
});

// ── Server-side registration with email auto-confirm ────────────────────────────
// Creates a new user via the Supabase Admin API so email confirmation is
// bypassed. The user can log in immediately after registration without
// needing to click a verification link (which may not arrive if SMTP is
// not configured in Supabase).
const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .strict();

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const supabaseAdmin = getSupabaseAdmin();

    // Create user with email already confirmed so login works immediately
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      const errMsg = error.message?.toLowerCase() ?? "";
      if (
        errMsg.includes("already registered") ||
        errMsg.includes("already been registered") ||
        errMsg.includes("already exists") ||
        errMsg.includes("duplicate")
      ) {
        // Return 409 so the client can detect "already exists" and attempt login
        return res.status(409).json({ ok: false, error: "An account with this email already exists. Please sign in." });
      }
      throw new HttpError(400, error.message, true);
    }

    // Upsert Supabase profile so the backend role table is in sync
    if (data?.user) {
      const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
      const role = adminEmail && email.trim().toLowerCase() === adminEmail ? "admin" : "user";
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: data.user.id, email, full_name: email.split("@")[0], role },
          { onConflict: "id" }
        )
        .catch(() => undefined); // Non-fatal
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
