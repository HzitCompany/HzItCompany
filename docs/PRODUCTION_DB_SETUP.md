# Production DB setup (Supabase)

This backend requires a Postgres schema. If the schema is missing, the API may fail to start (or routes like Careers `/apply` can fail due to missing tables).

## 1) Apply schema.sql (recommended)

1. Open **Supabase Dashboard → SQL Editor**
2. Create a **New query**
3. Copy/paste the contents of `server/db/schema.sql`
4. Click **Run**

This script is idempotent (`create table if not exists`, `create index if not exists`) so it is safe to re-run.

## 2) Verify tables exist

Run this in Supabase SQL Editor:

```sql
select
  to_regclass('public.users') as users,
  to_regclass('public.otp_codes') as otp_codes,
  to_regclass('public.sessions') as sessions,
  to_regclass('public.submissions') as submissions,
  to_regclass('public.career_applications') as career_applications,
  to_regclass('public.admin_users') as admin_users,
  to_regclass('public.site_content') as site_content,
  to_regclass('public.services_pricing') as services_pricing;
```

All columns should return a non-null value.

## 3) Alternative: auto-apply on server startup (use carefully)

You can set `DB_AUTO_SCHEMA=true` on the backend environment.

- This makes the server run DDL on startup if core tables are missing.
- It’s useful for **staging**.
- For **production**, prefer applying schema via Supabase SQL Editor so you have explicit control.

## 4) Quick production health check

Call:

- `GET /api/health`

If DB is reachable it returns:

```json
{ "ok": true, "db": true }
```

If DB is down/misconfigured it returns HTTP `503`:

```json
{ "ok": false, "db": false }
```

## 5) Quick schema check

Call:

- `GET /api/schema`

If schema is present:

```json
{ "ok": true, "missing": [] }
```

If schema is missing/out-of-date (HTTP `503`):

```json
{ "ok": false, "missing": ["users", "submissions"] }
```

## 6) If Render crashes on deploy

The backend now starts in a **diagnostics-only** mode when core tables are missing.

- `/api/health` and `/api/schema` still work.
- All other `/api/*` endpoints return `503` until you apply `server/db/schema.sql`.

This prevents crash-loops and makes it obvious which table is missing.
