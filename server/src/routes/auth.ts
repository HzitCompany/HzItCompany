import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";

import { query } from "../lib/db.js";
import { HttpError } from "../middleware/errorHandler.js";
import { hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { env } from "../lib/env.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  password: z.string().min(8).max(200)
});

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const rows = await query<{ id: number; name: string; email: string }>(
      "insert into clients (name, email, password_hash) values ($1,$2,$3) on conflict (email) do update set name = excluded.name returning id, name, email",
      [parsed.data.name, parsed.data.email.toLowerCase(), passwordHash]
    );

    const client = rows[0];
    if (!client) throw new HttpError(500, "Failed to create client");

    const token = signToken({ sub: String(client.id), email: client.email, role: "client", name: client.name });
    return res.json({ ok: true, token, role: "client" });
  } catch (err) {
    return next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200)
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();

    // Canonical admin (single credential): ADMIN_EMAIL + ADMIN_PASSWORD_HASH.
    // This path does not require a corresponding client account.
    if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH && email === env.ADMIN_EMAIL.toLowerCase()) {
      const ok = await verifyPassword(parsed.data.password, env.ADMIN_PASSWORD_HASH);
      if (!ok) throw new HttpError(401, "Invalid credentials", true);

      try {
        const upsertRows = await query<{ id: number; email: string; name: string | null; is_active: boolean }>(
          "insert into admin_users (email, is_active) values ($1, true) on conflict (email) do update set is_active = true returning id, email, name, is_active",
          [email]
        );

        const admin = upsertRows[0];
        const token = signToken({ sub: String(admin?.id ?? 0), email, role: "admin", name: admin?.name ?? "Admin" });
        return res.json({ ok: true, token, role: "admin" });
      } catch (err: any) {
        if (err?.code === "42P01") {
          throw new HttpError(503, "Database schema is missing admin_users. Apply server/db/schema.sql and redeploy.", true);
        }
        throw err;
      }
    }

    // Admin: email allowlist table.
    let adminRows: Array<{ id: number; email: string; name: string | null; is_active: boolean }> = [];
    try {
      adminRows = await query<{ id: number; email: string; name: string | null; is_active: boolean }>(
        "select id, email, name, is_active from admin_users where email = $1 limit 1",
        [email]
      );
    } catch (err: any) {
      if (err?.code === "42P01") {
        // If schema is incomplete, avoid a confusing 500.
        throw new HttpError(503, "Database schema is missing admin_users. Apply server/db/schema.sql and redeploy.", true);
      }
      throw err;
    }

    if (adminRows[0]?.is_active) {
      // Admin auth: still requires a password. For simplicity, reuse client password table by requiring an existing client.
      const clientRows = await query<{ id: number; password_hash: string; name: string }>(
        "select id, password_hash, name from clients where email = $1 limit 1",
        [email]
      );
      const client = clientRows[0];
      if (!client) throw new HttpError(401, "Invalid credentials", true);

      const ok = await verifyPassword(parsed.data.password, client.password_hash);
      if (!ok) throw new HttpError(401, "Invalid credentials", true);

      const token = signToken({ sub: String(adminRows[0].id), email, role: "admin", name: adminRows[0].name ?? client.name });
      return res.json({ ok: true, token, role: "admin" });
    }

    const rows = await query<{ id: number; name: string; email: string; password_hash: string }>(
      "select id, name, email, password_hash from clients where email = $1 limit 1",
      [email]
    );

    const client = rows[0];
    if (!client) throw new HttpError(401, "Invalid credentials", true);

    const ok = await verifyPassword(parsed.data.password, client.password_hash);
    if (!ok) throw new HttpError(401, "Invalid credentials", true);

    const token = signToken({ sub: String(client.id), email: client.email, role: "client", name: client.name });
    return res.json({ ok: true, token, role: "client" });
  } catch (err) {
    return next(err);
  }
});

const supabaseAuthSchema = z
  .object({
    accessToken: z.string().min(20)
  })
  .strict();

authRouter.post("/auth/supabase", async (req, res, next) => {
  try {
    const parsed = supabaseAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(parsed.data.accessToken);
    if (error || !data?.user) throw new HttpError(401, "Invalid Google session", true);

    const email = data.user.email?.toLowerCase();
    if (!email) throw new HttpError(400, "Google account is missing an email", true);

    const meta: any = data.user.user_metadata ?? {};
    const nameRaw =
      (typeof meta.full_name === "string" && meta.full_name.trim())
        ? meta.full_name.trim()
        : (typeof meta.name === "string" && meta.name.trim())
          ? meta.name.trim()
          : null;
    const name = nameRaw ?? "Client";

    const randomPassword = crypto.randomBytes(32).toString("hex");
    const randomHash = await hashPassword(randomPassword);

    const clientRows = await query<{ id: number; name: string; email: string }>(
      "insert into clients (name, email, password_hash) values ($1,$2,$3) on conflict (email) do update set name = excluded.name returning id, name, email",
      [name, email, randomHash]
    );

    const client = clientRows[0];
    if (!client) throw new HttpError(500, "Failed to create client");

    // Admin role is granted only to allowlisted emails (or the canonical admin email).
    let adminId: number | null = null;
    if (env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase()) {
      const upsert = await query<{ id: number }>(
        "insert into admin_users (email, is_active) values ($1, true) on conflict (email) do update set is_active = true returning id",
        [email]
      );
      adminId = upsert[0]?.id ?? null;
    } else {
      const rows = await query<{ id: number }>(
        "select id from admin_users where email = $1 and is_active = true limit 1",
        [email]
      );
      adminId = rows[0]?.id ?? null;
    }

    const role = adminId ? "admin" : "client";
    const token = signToken({ sub: String(adminId ?? client.id), email, role, name });
    return res.json({ ok: true, token, role });
  } catch (err) {
    return next(err);
  }
});
