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

  // Public website URL (used for Supabase email OTP redirect).
  WEB_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional()
  ),

  DATABASE_URL: z.string().url(),

  // Auto-apply db/schema.sql on startup if core tables are missing.
  // Defaults to true so a fresh deployment works without manual SQL steps.
  // Set DB_AUTO_SCHEMA=false to disable if you want full manual control.
  DB_AUTO_SCHEMA: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
      z.enum(["true", "false"]).default("true")
    )
    .transform((v) => v === "true"),

  JWT_SECRET: z.string().min(32),

  // Admin
  ADMIN_EMAIL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().optional()
  ),

  ADMIN_PASSWORD_HASH: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(20).max(200).optional()
  ),

  // Google Identity Services (backend verification)
  GOOGLE_CLIENT_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(10).optional()
  ),

  // Session cookie
  SESSION_COOKIE_NAME: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).max(64).optional()
  ),
  SESSION_COOKIE_DOMAIN: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).max(253).optional()
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

  // Optional email integration (Amazon SES SMTP). Empty strings are treated as "unset".
  SES_SMTP_USER: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  SES_SMTP_PASSWORD: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  AWS_SES_REGION: z.preprocess(
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
  // Public bucket for site images/assets used by CMS blocks.
  // This bucket should be configured as "public" in Supabase Storage.
  SUPABASE_PUBLIC_BUCKET: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  CAREER_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024)
  })
  .superRefine((val, ctx) => {
    // Only enforce MAIL_FROM when SES SMTP credentials are set (needed for OTP emails).
    if (!val.SES_SMTP_USER) return;
    if (!val.MAIL_FROM) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MAIL_FROM"], message: "Required when SES_SMTP_USER is set" });

    // ADMIN_PASSWORD_HASH is optional (admin can login via email OTP or Google OAuth).
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
