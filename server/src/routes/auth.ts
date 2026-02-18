import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";

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
    const role = user.email === "hzitcompany@gmail.com" ? "admin" : "user";

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
