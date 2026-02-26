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
      "to_regclass('public.submissions') as submissions,",
      "to_regclass('public.admin_users') as admin_users,",
      "to_regclass('public.contact_submissions') as contact_submissions,",
      "to_regclass('public.hire_us_submissions') as hire_us_submissions,",
      "to_regclass('public.career_applications') as career_applications,",
      "to_regclass('public.site_content') as site_content,",
      "to_regclass('public.services_pricing') as services_pricing"
    ].join("\n")
  );

  const row = result.rows[0] ?? {};

  const requiredKeys = ["users", "sessions", "submissions", "admin_users"] as const;
  const optionalKeys = [
    "otp_codes",
    "contact_submissions",
    "hire_us_submissions",
    "career_applications",
    "site_content",
    "services_pricing"
  ] as const;

  const missingRequired = requiredKeys.filter((key) => !row[key]);
  const missingOptional = optionalKeys.filter((key) => !row[key]);

  return {
    ok: missingRequired.length === 0,
    missingRequired: [...missingRequired],
    missingOptional: [...missingOptional]
  };
}

export async function getSchemaStatus() {
  return isCoreSchemaPresent();
}

export async function ensureSchemaOrThrow() {
  const state = await isCoreSchemaPresent();
  if (state.ok) return;

  if (!env.DB_AUTO_SCHEMA) {
    throw new Error(
      [
        "Database schema is missing or out of date.",
        state.missingRequired.length ? `Missing: ${state.missingRequired.join(", ")}` : "",
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
  if (!after.ok) {
    throw new Error(
      `Schema apply finished, but required tables are still missing: ${after.missingRequired.join(", ")}`
    );
  }

  logger.info("Database schema applied successfully");
}

// ── Incremental migrations ────────────────────────────────────────────────────
// These run on every startup and are fully idempotent (safe to re-run).
// Add new migrations here instead of modifying schema.sql when altering
// existing live tables.
const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "make_submissions_user_id_nullable",
    sql: `
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name   = 'submissions'
            AND column_name  = 'user_id'
            AND is_nullable  = 'NO'
        ) THEN
          ALTER TABLE submissions ALTER COLUMN user_id DROP NOT NULL;
        END IF;
      END $$;
    `
  }
];

export async function runMigrations() {
  for (const migration of MIGRATIONS) {
    try {
      await pool.query(migration.sql);
      logger.info({ migration: migration.name }, "Migration applied");
    } catch (err) {
      // Log but don't crash — a failed migration should not prevent the server
      // from starting. The affected feature will surface its own error.
      logger.error({ migration: migration.name, err }, "Migration failed (non-fatal)");
    }
  }
}
