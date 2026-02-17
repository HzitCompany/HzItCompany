import { z } from "zod";
import "dotenv/config";

const envSchema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8082),

  CORS_ORIGINS: z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),

  DATABASE_URL: z.string().url(),

  // Dev helper: auto-apply db/schema.sql on startup if core tables are missing.
  // Keep this disabled in production unless you explicitly want the server to run DDL.
  DB_AUTO_SCHEMA: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
      z.enum(["true", "false"]).optional()
    )
    .transform((v) => v === "true"),

  JWT_SECRET: z.string().min(32),

  // Admin
  ADMIN_EMAIL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().optional()
  ),

  ADMIN_PASSWORD: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(8).max(200).optional()
  ),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  RAZORPAY_KEY_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  RAZORPAY_KEY_SECRET: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),

  // Optional email integration (Resend). Empty strings are treated as "unset".
  RESEND_API_KEY: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  MAIL_FROM: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  MAIL_TO: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),

  // SMS OTP (MSG91)
  MSG91_AUTH_KEY: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  MSG91_SENDER_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).max(30).optional()
  ),
  MSG91_TEMPLATE_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  OTP_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),
  // Supabase Storage (private resumes)
  SUPABASE_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional()
  ),
  // Supabase Auth (OTP)
  // Public anon key used server-side only to initiate/verify OTP.
  // Keep this in backend env vars (not in frontend).
  SUPABASE_ANON_KEY: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  SUPABASE_STORAGE_BUCKET: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  CAREER_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024)
  })
  .superRefine((val, ctx) => {
    // Only enforce MAIL_FROM/MAIL_TO when RESEND_API_KEY is set.
    if (!val.RESEND_API_KEY) return;
    if (!val.MAIL_FROM) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MAIL_FROM"], message: "Required when RESEND_API_KEY is set" });
    if (!val.MAIL_TO) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MAIL_TO"], message: "Required when RESEND_API_KEY is set" });

    // SMS: if template is set, auth key must be set.
    if (val.MSG91_TEMPLATE_ID && !val.MSG91_AUTH_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MSG91_AUTH_KEY"], message: "Required when MSG91_TEMPLATE_ID is set" });
    }

    if (val.ADMIN_EMAIL && !val.ADMIN_PASSWORD) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ADMIN_PASSWORD"], message: "Required when ADMIN_EMAIL is set" });
    }
  });

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const flattened = parsed.error.flatten();
  const missingOrInvalid = Object.entries(flattened.fieldErrors)
    .filter(([, errors]) => (errors?.length ?? 0) > 0)
    .map(([key, errors]) => `- ${key}: ${errors?.[0] ?? "Invalid"}`)
    .join("\n");

  // eslint-disable-next-line no-console
  console.error(
    [
      "[hz-it-company-api] Invalid environment configuration.",
      "Create `server/.env` based on `server/.env.example`.",
      "",
      missingOrInvalid
    ].join("\n")
  );
  process.exit(1);

  // For TypeScript control-flow analysis (and non-standard runtimes), ensure we never continue.
  throw new Error("Invalid environment configuration");
}

export const env: Env = parsed.data;
