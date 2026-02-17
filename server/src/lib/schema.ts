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
  const result = await pool.query<{
    users: string | null;
    otp_codes: string | null;
    sessions: string | null;
  }>(
    "select to_regclass('public.users') as users, to_regclass('public.otp_codes') as otp_codes, to_regclass('public.sessions') as sessions"
  );

  const row = result.rows[0];
  return Boolean(row?.users && row?.otp_codes && row?.sessions);
}

export async function ensureSchemaOrThrow() {
  const ok = await isCoreSchemaPresent();
  if (ok) return;

  if (!env.DB_AUTO_SCHEMA) {
    throw new Error(
      "Database schema is missing (e.g. table 'users'). Apply server/db/schema.sql to your Postgres/Supabase database, or set DB_AUTO_SCHEMA=true in server/.env."
    );
  }

  const schemaPath = await locateSchemaSqlPath();
  logger.warn({ schemaPath }, "Database schema missing; applying schema.sql");

  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);

  const okAfter = await isCoreSchemaPresent();
  if (!okAfter) {
    throw new Error("Schema apply finished, but core tables are still missing");
  }

  logger.info("Database schema applied successfully");
}
