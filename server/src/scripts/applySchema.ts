import fs from "node:fs/promises";
import path from "node:path";

import { initDb, pool } from "../lib/db.js";
import { logger } from "../lib/logger.js";

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

  throw new Error(`Could not find schema.sql. Looked in: ${candidates.join(", ")}`);
}

async function assertCoreTablesExist() {
  const result = await pool.query<{
    users: string | null;
    otp_codes: string | null;
    sessions: string | null;
  }>(
    "select to_regclass('public.users') as users, to_regclass('public.otp_codes') as otp_codes, to_regclass('public.sessions') as sessions"
  );

  const row = result.rows[0];
  if (!row?.users || !row?.otp_codes || !row?.sessions) {
    throw new Error("Schema applied but core tables are still missing (users/otp_codes/sessions)");
  }
}

async function main() {
  await initDb();

  const schemaPath = await locateSchemaSqlPath();
  logger.info({ schemaPath }, "Applying schema.sql");

  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);

  await assertCoreTablesExist();

  logger.info("Schema apply complete");
}

main().catch((err) => {
  logger.error({ err }, "Failed to apply schema");
  process.exit(1);
});
