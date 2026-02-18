import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Some hosts/build pipelines do not load `.env.production` into Vite's compile-time env.
// Supabase URL + anon key are safe to ship client-side; use a production fallback to avoid broken auth.
const fallbackSupabaseUrl = "https://tuykkeymrfzdgxwkdwph.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWtrZXltcmZ6ZGd4d2tkd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjMyMjYsImV4cCI6MjA4NjgzOTIyNn0.zHO7kSaoRlcx0vHQvPQbofznosuo893HztZ3TRPHXQ4";

const effectiveSupabaseUrl = supabaseUrl || (import.meta.env.PROD ? fallbackSupabaseUrl : undefined);
const effectiveSupabaseAnonKey = supabaseAnonKey || (import.meta.env.PROD ? fallbackSupabaseAnonKey : undefined);

if (import.meta.env.PROD) {
  if (!supabaseUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      "[hz] Missing VITE_SUPABASE_URL in production build; using fallback Supabase project. Ensure backend SUPABASE_URL matches to avoid 401 Invalid token."
    );
  }
  if (!supabaseAnonKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "[hz] Missing VITE_SUPABASE_ANON_KEY in production build; using fallback Supabase anon key. Ensure backend SUPABASE_URL matches to avoid 401 Invalid token."
    );
  }
}

export const isSupabaseConfigured = Boolean(effectiveSupabaseUrl && effectiveSupabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(effectiveSupabaseUrl as string, effectiveSupabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}
