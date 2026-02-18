import { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { query } from "../lib/db.js";

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

  if (existing[0]?.id) return existing[0].id;

  const inserted = await query<{ id: number }>(
    "insert into users (email, phone) values ($1,$2) returning id",
    [email, phone]
  );

  const id = inserted[0]?.id;
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
    const supabase = getSupabaseAdmin();
    // Validate the token and get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new HttpError(401, "Unauthorized: Invalid token", true));
    }

    // Determine Role from DB only (use Supabase profiles.role)
    let role: "admin" | "user" = "user";

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (profile?.role === "admin") {
      role = "admin";
    }

    const provider = (user.app_metadata as any)?.provider as string | undefined;
    const phone = (user as any)?.phone as string | undefined;
    const sub = await getOrCreateLocalUserId({ email: user.email ?? null, phone: phone ?? null });

    req.user = {
      id: user.id,
      email: user.email ?? undefined,
      phone,
      provider,
      sub,
      role,
    };

    next();
  } catch (err: any) {
    // Distinguish between network errors and auth errors if possible
    return next(new HttpError(401, "Unauthorized: Validation failed", true));
  }
}

// Middleware to enforce Admin role
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Unauthorized", true));
  if (req.user.role !== "admin") return next(new HttpError(403, "Forbidden: Admin access required", true));
  next();
}
