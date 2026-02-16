import pg from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

const { Pool } = pg;

function maskDatabaseUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.password) url.password = "****";
    return url.toString();
  } catch {
    // Fall back to a conservative mask that avoids logging secrets.
    return raw.replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:****@");
  }
}

function getSafeDbTarget(raw: string) {
  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: url.port || undefined,
      database: url.pathname.replace(/^\//, "") || undefined,
      user: url.username || undefined
    };
  } catch {
    return undefined;
  }
}

function describeDbError(err: unknown) {
  const anyErr = err as any;
  const code = anyErr?.code as string | undefined;
  const message = String(anyErr?.message ?? "Unknown database error");

  const hints: string[] = [];

  if (code === "ENOTFOUND") {
    hints.push("DNS lookup failed. Double-check the pooler host and your internet/VPN.");
  }

  if (code === "EAI_AGAIN") {
    hints.push("Temporary DNS failure. Retry, or switch networks/VPN.");
  }

  if (code === "ECONNREFUSED" || code === "ETIMEDOUT") {
    hints.push("Connection refused/timed out. Verify host/port and that the pooler is reachable.");
  }

  if (code === "ENETUNREACH" || code === "EHOSTUNREACH") {
    hints.push("Network unreachable. If your network prefers IPv6, use the Supabase Session Pooler (IPv4 compatible) connection string.");
  }

  if (code === "28P01") {
    hints.push("Password authentication failed. Re-copy the Session Pooler DATABASE_URL from Supabase and ensure special characters are URL-encoded.");
  }

  if (code === "SELF_SIGNED_CERT_IN_CHAIN") {
    hints.push("SSL certificate chain validation failed. Avoid adding sslmode=require to DATABASE_URL; SSL is enforced via the pg Pool ssl option.");
  }

  if (message.toLowerCase().includes("connect")) {
    hints.push("If you see IPv6-related connection issues, use the Supabase Pooler (IPv4 compatible) connection string.");
  }

  if (message.includes("::") || message.toLowerCase().includes("ipv6")) {
    hints.push("This looks like an IPv6 path. Use the Supabase Session Pooler (IPv4 compatible) host shown in the dashboard.");
  }

  return { code, message, hints };
}

function getDatabaseUrlOrExit() {
  const value = env.DATABASE_URL;
  if (!value) {
    logger.fatal("DATABASE_URL is missing. Set it in server/.env");
    process.exit(1);
  }
  return value;
}

export const pool = new Pool({
  connectionString: getDatabaseUrlOrExit(),
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on("error", (err) => {
  logger.error({ err }, "Postgres pool error");
});

export async function initDb() {
  try {
    await pool.query("select 1 as ok");
    logger.info(
      { ssl: true, db: getSafeDbTarget(env.DATABASE_URL) },
      "Postgres connection ok"
    );
  } catch (err) {
    const safeUrl = maskDatabaseUrl(env.DATABASE_URL);
    const details = describeDbError(err);

    logger.error(
      {
        err,
        code: details.code,
        db: {
          url: safeUrl
        },
        hints: details.hints
      },
      "Postgres connection failed"
    );
    throw err;
  }
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function insertContactMessage(input: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  await pool.query(
    "insert into contact_messages (name, email, phone, message) values ($1,$2,$3,$4)",
    [input.name, input.email, input.phone ?? null, input.message]
  );
}

export async function insertHireRequest(input: {
  name: string;
  email: string;
  service: string;
  budget?: string;
  details?: string;
}) {
  await pool.query(
    "insert into hire_requests (name, email, service, budget, details) values ($1,$2,$3,$4,$5)",
    [input.name, input.email, input.service, input.budget ?? null, input.details ?? null]
  );
}
