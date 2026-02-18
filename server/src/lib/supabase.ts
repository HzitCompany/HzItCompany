import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "./env.js";
import { HttpError } from "../middleware/errorHandler.js";

let cachedAdmin: SupabaseClient | null = null;
let cachedAuth: SupabaseClient | null = null;

// Public fallback (matches frontend) to avoid production auth breakage
// when hosting env vars aren't correctly injected.
const fallbackSupabaseUrl = "https://tuykkeymrfzdgxwkdwph.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWtrZXltcmZ6ZGd4d2tkd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjMyMjYsImV4cCI6MjA4NjgzOTIyNn0.zHO7kSaoRlcx0vHQvPQbofznosuo893HztZ3TRPHXQ4";

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

  const url = env.SUPABASE_URL ?? fallbackSupabaseUrl;
  const anonKey = env.SUPABASE_ANON_KEY ?? fallbackSupabaseAnonKey;

  cachedAuth = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return cachedAuth;
}

export function getResumesBucketId() {
  return env.SUPABASE_STORAGE_BUCKET || "resumes";
}
