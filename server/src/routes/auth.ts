import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdmin, getSupabaseAuth } from "../lib/supabase.js";
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

// ── Server-side login proxy ──────────────────────────────────────────────────
// The browser may not be able to reach Supabase directly (cold-start timeout,
// geo-blocking, free-tier pause). Routing login through the server avoids this.
const loginSchema2 = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema2.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid request" });

    const { email, password } = parsed.data;
    const supabaseAuth = getSupabaseAuth();
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      const msg = error?.message ?? "Authentication failed";
      const code = error?.status ?? 400;
      return res.status(code).json({ ok: false, error: msg });
    }

    return res.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

// ── Check email existence (no side effects) ───────────────────────────────────
// Used by the frontend to distinguish "wrong password" from "not signed up"
// without creating ghost accounts. Uses Admin API getUserByEmail lookup.
const checkEmailSchema = z.object({ email: z.string().email() }).strict();

authRouter.post("/auth/check-email", async (req, res, next) => {
  try {
    const parsed = checkEmailSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid request" });

    const { email } = parsed.data;
    const supabaseAdmin = getSupabaseAdmin();

    // getUserByEmail is the correct Admin API method to look up a user by email.
    // It does NOT create any account — pure read operation.
    // Cast to any to bypass the TS error on older supabase-js versions where the type is missing.
    const { data, error } = await (supabaseAdmin.auth.admin as any).getUserByEmail(email);

    if (error) {
      // If the error message indicates not found, the user doesn't exist.
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("not found") || msg.includes("no user")) {
        return res.json({ ok: true, exists: false });
      }
      // For any other admin API error (e.g., service role not configured),
      // return null so the frontend degrades gracefully.
      return res.json({ ok: true, exists: null });
    }

    return res.json({ ok: true, exists: !!data?.user });
  } catch (err) {
    next(err);
  }
});

// ── Server-side forgot-password proxy ─────────────────────────────────────────────
const forgotSchema = z.object({ email: z.string().email(), redirectTo: z.string().url().optional() }).strict();

authRouter.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid request" });

    const { email, redirectTo } = parsed.data;
    const supabaseAuth = getSupabaseAuth();
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? "https://www.hzitcompany.com/auth",
    });

    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Server-side registration with email auto-confirm ──────────────────────────────
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
      try {
        await supabaseAdmin
          .from("profiles")
          .upsert(
            { id: data.user.id, email, full_name: email.split("@")[0], role },
            { onConflict: "id" }
          );
      } catch {
        // Non-fatal
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
