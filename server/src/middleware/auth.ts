import { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler.js";
import { env } from "../lib/env.js";
import { getSupabaseAdmin, getSupabaseAuth } from "../lib/supabase.js";
import { query } from "../lib/db.js";
import { verifySupabaseJwtViaJwks } from "../lib/supabaseJwt.js";

// Helper interface for typed requests
export interface AuthedRequest extends Request {
  user?: {
    // Supabase Auth user id (UUID string)
    id: string;
    email?: string;
    phone?: string;
    provider?: string;

    // Local DB user id (bigint) used by legacy tables.
    sub: number;
    role: "admin" | "user";
  };
}

async function getOrCreateLocalUserId(input: { email: string | null; phone: string | null }) {
  const toFiniteUserId = (value: unknown) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const email = input.email?.trim().toLowerCase() ?? null;
  const phone = input.phone?.trim() ?? null;

  if (!email && !phone) {
    throw new HttpError(401, "Unauthorized: user missing email/phone", true);
  }

  const existing = await query<{ id: number }>(
    [
      "select id",
      "from users",
      "where ($1::text is not null and email = $1)",
      "   or ($2::text is not null and phone = $2)",
      "limit 1",
    ].join("\n"),
    [email, phone]
  );

  const existingId = toFiniteUserId(existing[0]?.id);
  if (existingId) return existingId;

  const inserted = await query<{ id: number }>(
    "insert into users (email, phone) values ($1,$2) returning id",
    [email, phone]
  );

  const id = toFiniteUserId(inserted[0]?.id);
  if (!id) throw new HttpError(500, "Failed to create local user", false);
  return id;
}

// Middleware to verify Supabase JWT token
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return next(new HttpError(401, "Unauthorized: No token provided", true));
  }

  try {
    let user:
      | {
          id: string;
          email?: string | null;
          app_metadata?: unknown;
        }
      | null = null;

    let phone: string | undefined;
    let provider: string | undefined;

    // Validate the token and resolve the user.
    // Order:
    // 1) JWKS verification (based on token issuer) — works even if backend env vars are misconfigured
    // 2) Supabase Auth (anon key) if configured
    // 3) Supabase Admin (service role) if configured
    //
    // This reduces "401 Unauthorized" caused by backend/ frontend Supabase project mismatch.

    // 1) Prefer JWKS verification (no dependency on backend SUPABASE_* env vars).
    try {
      const verified = await verifySupabaseJwtViaJwks(token);
      user = { id: verified.sub, email: verified.email ?? null, app_metadata: { provider: verified.provider } };
      provider = verified.provider;
      phone = verified.phone;
    } catch (jwksErr: any) {
      // Continue to Supabase API fallback.
      // We'll use this error if other strategies fail.
      (req as any).__jwksAuthError = jwksErr;
    }

    const trySupabaseGetUser = async (mode: "auth" | "admin") => {
      try {
        const client = mode === "auth" ? getSupabaseAuth() : getSupabaseAdmin();
        const { data, error } = await client.auth.getUser(token);
        if (!error && data?.user) {
          user = data.user as any;
          provider = (data.user.app_metadata as any)?.provider;
          phone = (data.user as any)?.phone;
          return true;
        }
      } catch {
        // Ignore and fall through to next strategy.
      }
      return false;
    };

    if (!user) await trySupabaseGetUser("auth");
    if (!user) await trySupabaseGetUser("admin");

    if (!user?.id) {
      return next(new HttpError(401, "Unauthorized: Invalid token", true));
    }

    // Determine Role from DB only (use Supabase profiles.role)
    let role: "admin" | "user" = "user";

    // Prefer profiles.role via service-role (bypasses RLS). If storage/admin env isn't configured,
    // fall back to ADMIN_EMAIL for bootstrap.
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role === "admin") role = "admin";
    } catch {
      // Ignore role lookup failures; we'll default to "user" and rely on ADMIN_EMAIL fallback.
    }

    if (role !== "admin" && env.ADMIN_EMAIL && user.email) {
      if (user.email.trim().toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase()) {
        role = "admin";
      }
    }

    const email = (user as any)?.email ?? null;
    const sub = await getOrCreateLocalUserId({ email, phone: phone ?? null });

    req.user = {
      id: user.id,
      email: email ?? undefined,
      phone,
      provider,
      sub,
      role,
    };

    next();
  } catch (err: any) {
    if (err instanceof HttpError) return next(err);
    // Token validation failed (including JWKS failure).
    return next(new HttpError(401, "Unauthorized: Invalid token", true));
  }
}

// Middleware that tries to authenticate the request but does NOT reject unauthenticated callers.
// If a valid token is present, req.user is set exactly as requireAuth does.
// If no token or the token is invalid, req.user remains undefined and the request continues.
export async function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) return next(); // No token → continue as anonymous

  try {
    let user:
      | {
          id: string;
          email?: string | null;
          app_metadata?: unknown;
        }
      | null = null;

    let phone: string | undefined;
    let provider: string | undefined;

    try {
      const verified = await verifySupabaseJwtViaJwks(token);
      user = { id: verified.sub, email: verified.email ?? null, app_metadata: { provider: verified.provider } };
      provider = verified.provider;
      phone = verified.phone;
    } catch {
      // Ignore JWKS failure — try Supabase API fallbacks below
    }

    const trySupabaseGetUser = async (mode: "auth" | "admin") => {
      try {
        const client = mode === "auth" ? getSupabaseAuth() : getSupabaseAdmin();
        const { data, error } = await client.auth.getUser(token);
        if (!error && data?.user) {
          user = data.user as any;
          provider = (data.user.app_metadata as any)?.provider;
          phone = (data.user as any)?.phone;
          return true;
        }
      } catch {
        // Ignore
      }
      return false;
    };

    if (!user) await trySupabaseGetUser("auth");
    if (!user) await trySupabaseGetUser("admin");

    if (!user?.id) return next(); // Token invalid → continue as anonymous

    let role: "admin" | "user" = "user";
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role === "admin") role = "admin";
    } catch {
      // Ignore
    }

    if (role !== "admin" && env.ADMIN_EMAIL && user.email) {
      if (user.email.trim().toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase()) {
        role = "admin";
      }
    }

    const email = (user as any)?.email ?? null;
    const sub = await getOrCreateLocalUserId({ email, phone: phone ?? null });

    req.user = { id: user.id, email: email ?? undefined, phone, provider, sub, role };
    next();
  } catch {
    // Any unexpected error → continue as anonymous (don't block the request)
    next();
  }
}

// Middleware to enforce Admin role
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Unauthorized", true));
  if (req.user.role !== "admin") return next(new HttpError(403, "Forbidden: Admin access required", true));
  next();
}
