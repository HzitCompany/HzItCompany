import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "./env.js";
import { HttpError } from "../middleware/errorHandler.js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(
      503,
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend.",
      true
    );
  }

  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return cached;
}

export function getResumesBucketId() {
  return env.SUPABASE_STORAGE_BUCKET || "resumes";
}
