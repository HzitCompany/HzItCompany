import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "./env.js";
import { HttpError } from "../middleware/errorHandler.js";

let cachedAdmin: SupabaseClient | null = null;
let cachedAuth: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(
      503,
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend.",
      true
    );
  }

  cachedAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return cachedAdmin;
}

export function getSupabaseAuth(): SupabaseClient {
  if (cachedAuth) return cachedAuth;

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new HttpError(
      503,
      "Supabase Auth OTP is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the backend.",
      true
    );
  }

  cachedAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return cachedAuth;
}

export function getResumesBucketId() {
  return env.SUPABASE_STORAGE_BUCKET || "resumes";
}
