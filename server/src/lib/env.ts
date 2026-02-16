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

  JWT_SECRET: z.string().min(32),

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
  )
  })
  .superRefine((val, ctx) => {
    // Only enforce MAIL_FROM/MAIL_TO when RESEND_API_KEY is set.
    if (!val.RESEND_API_KEY) return;
    if (!val.MAIL_FROM) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MAIL_FROM"], message: "Required when RESEND_API_KEY is set" });
    if (!val.MAIL_TO) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MAIL_TO"], message: "Required when RESEND_API_KEY is set" });
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
}

export const env: Env = parsed.data;
