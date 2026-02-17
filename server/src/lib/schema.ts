import fs from "node:fs/promises";
import path from "node:path";

import { env } from "./env.js";
import { pool } from "./db.js";
import { logger } from "./logger.js";

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function locateSchemaSqlPath() {
  const candidates = [
    path.resolve(process.cwd(), "db", "schema.sql"),
    path.resolve(process.cwd(), "server", "db", "schema.sql")
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  throw new Error(
    `Could not find schema.sql. Looked in: ${candidates.join(", ")}. ` +
      "Run the SQL in server/db/schema.sql manually, or start the server with cwd=server."
  );
}

async function isCoreSchemaPresent() {
  const result = await pool.query<Record<string, string | null>>(
    [
      "select",
      "to_regclass('public.users') as users,",
      "to_regclass('public.otp_codes') as otp_codes,",
      "to_regclass('public.sessions') as sessions,",
      "to_regclass('public.contact_submissions') as contact_submissions,",
      "to_regclass('public.hire_us_submissions') as hire_us_submissions,",
      "to_regclass('public.submissions') as submissions,",
      "to_regclass('public.career_applications') as career_applications,",
      "to_regclass('public.admin_users') as admin_users,",
      "to_regclass('public.site_content') as site_content,",
      "to_regclass('public.services_pricing') as services_pricing"
    ].join("\n")
  );

  const row = result.rows[0] ?? {};
  const missing = Object.entries(row)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return { ok: missing.length === 0, missing };
}

export async function ensureSchemaOrThrow() {
  const state = await isCoreSchemaPresent();
  if (state.ok) return;

  if (!env.DB_AUTO_SCHEMA) {
    throw new Error(
      [
        "Database schema is missing or out of date.",
        state.missing.length ? `Missing: ${state.missing.join(", ")}` : "",
        "Apply server/db/schema.sql to your Postgres/Supabase database, or set DB_AUTO_SCHEMA=true and restart the server."
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  const schemaPath = await locateSchemaSqlPath();
  logger.warn({ schemaPath }, "Database schema missing; applying schema.sql");

  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);

  const after = await isCoreSchemaPresent();
  if (!after.ok) throw new Error(`Schema apply finished, but tables are still missing: ${after.missing.join(", ")}`);

  logger.info("Database schema applied successfully");
}
