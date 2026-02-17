# Render Environment Variables Checklist

Use this when deploying the backend (Express API) on Render.

## Required (API must start)
- `NODE_ENV=production`
- `PORT` (Render usually injects this)
- `CORS_ORIGINS` (include your frontend domain)
- `DATABASE_URL` (Supabase Postgres Session Pooler recommended)
- `JWT_SECRET` (>= 32 chars)

## Required (OTP login in production)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Required (Admin password login)
- `ADMIN_EMAIL=hzitcompany@gmail.com`
- `ADMIN_PASSWORD=HzItCompany@2026`

## Required only if you use resume uploads (Careers)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=resumes` (or your bucket name)

## Optional
- `DB_AUTO_SCHEMA=false` (recommended in production)
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO`

## Quick production sanity checks
- `GET /api/health` should return `{ ok: true, db: true }`
- `GET /api/schema` should return `ok: true` (or show which tables are missing)
- OTP request should return 200: `POST /api/auth/otp/request`
