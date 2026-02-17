# HZ IT Company Platform — Production-Grade System Plan (Feb 2026)

This document describes a secure, scalable architecture and implementation plan for:

- Careers application portal (recruitment)
- Email + India SMS OTP verification
- Supabase Storage resume uploads
- Admin dashboard + RBAC
- Orders workflow **without online payment** (Razorpay disabled)
- Manual/admin-triggered invoice generation
- Client portal
- Content editor backed by Postgres
- Deployment architecture and India-focused checklist

It is written to match the current repo architecture:
- Frontend: React + Vite + Tailwind
- Backend: Express + TypeScript (Node ESM)
- DB: Supabase Postgres

---

## 0) Current repo reality (baseline)

Backend already has:
- JWT auth middleware (client/admin roles)
- Rate limiting, CORS, Helmet, JSON middleware
- Postgres access via `pg` pool
- PDF invoice generation via PDFKit

Key code locations:
- Express app: `server/src/app.ts`
- Server entry: `server/src/index.ts`
- Auth middleware: `server/src/middleware/auth.ts`
- Auth routes: `server/src/routes/auth.ts`
- Orders + invoice: `server/src/routes/orders.ts`, `server/src/routes/invoice.ts`
- DB schema: `server/db/schema.sql`

---

## 1) Navbar & Footer: Careers link

Frontend UI adds:
- Navbar link: Home | About | Services | Portfolio | Contact | Careers
- Footer Quick Links includes Careers

Route:
- `/careers`

---

## 2) Authentication system (email + phone)

### Target behavior
Users must be logged in before accessing:
- Contact form submit
- Hire Us submit
- Career application submit

Additionally, users must be verified:
- Email verified
- Phone verified via OTP

### Recommended strategy
Use a single **users** table and make “client portal” and “form access” use the same identity.

If you want to avoid a risky migration immediately, you can phase it:
- Phase A: Create `users` table and new auth endpoints
- Phase B: Migrate existing `clients` rows into `users`
- Phase C: Remove `clients` once frontend is fully moved

---

## 3) OTP system (India)

### Requirements
- Generate 6-digit OTP
- Store **hashed OTP** + expiry
- Verify OTP
- Rate-limit OTP request and verification

### Design
- OTP is never stored in plaintext.
- Store `otp_hash = sha256(otp + ':' + per_row_salt)`.
- Enforce TTL (e.g. 5 minutes).
- Enforce per-user request limits (DB + API rate limit).

### Provider adapter
Implement a small interface, so you can swap MSG91/Twilio/Fast2SMS.

---

## 4) Career application system

### Data capture
Use a multi-step UI, but a single backend submission endpoint.
Store structured JSON for flexible fields.

Recommended table model:
- `career_applications` stores all form fields + resume/cv URLs.

---

## 5) Resume storage (Supabase Storage)

### Best practice
Do **not** stream files through Express in production.
Instead:
1) Backend issues **signed upload URL** (requires Supabase service-role key)
2) Frontend uploads directly to Supabase Storage
3) Backend stores the public URL/path in Postgres

Validate:
- Content type: PDF/DOC/DOCX
- Size limit

---

## 6) Email notifications (Resend)

Send (async fire-and-forget, with error logging):
1) Applicant confirmation
2) Company notification to `Hzitcompany@gmail.com`

Also store record in DB for admin dashboard.

---

## 7) Orders workflow (NO online payment)

### Requirement
Razorpay disabled for now.

### Implementation
- Keep `payment_status` column as a placeholder for future.
- New orders are created with:
  - `payment_status = 'pending'` (or `'unpaid'` if you expand the enum)
  - business status field: `status = 'Pending'`

Admin can set status:
- Pending → Approved → In Progress → Completed

---

## 8) Invoice generation (manual/admin)

### Requirement
Admin can generate invoice after approving an order.

### Implementation
- Add an admin endpoint to create an invoice record (idempotent)
- Allow invoice PDF download if invoice exists and the requester is owner/admin

---

## 9) Client portal

Features:
- Login
- View orders & statuses
- Download invoices

---

## 10) Admin dashboard

### Sections
- Contact submissions
- Hire Us requests
- Career applications
- Orders + status

### Admin actions
- Approve/reject/update orders
- Generate invoice
- Edit pricing
- Edit website content

---

## 11) Admin access control

- Keep `admin_users` allowlist.
- Middleware:
  - `requireAuth`
  - `requireAdmin`
  - `requireVerifiedUser` (email + phone verified)

---

## 12) Admin UI design

Recommended UI composition:
- Sidebar layout
- Stats cards
- Tables with search/filter
- Detail drawer/modal for applicants
- Forms for content/pricing

---

## 13) Website content editor

Use `site_content` table (already present in schema) with:
- key: `home.hero`, `about.page`, `services.list`, `pricing.blocks`, etc.
- value: JSON

Admin endpoints:
- GET `/api/admin/content?key=...`
- PUT `/api/admin/content` { key, value }

---

## 14) Security hardening

- Zod on all inputs
- Rate limit OTP endpoints separately
- Hash passwords (bcrypt)
- Hash OTP (sha256 + salt)
- Enforce verified status for sensitive forms
- Prevent duplicate submissions:
  - unique constraints or idempotency keys

---

## 15) Deployment architecture (scalable)

Frontend:
- Vercel (CDN)

Backend:
- Railway / Render / VPS (PM2 or systemd)

DB:
- Supabase Postgres

Storage:
- Supabase Storage

Email:
- Resend

SMS:
- MSG91 / Twilio / Fast2SMS

---

## 16) Future payment integration (placeholder)

- Add env: `PAYMENTS_ENABLED=false`
- If enabled and keys exist, create Razorpay order
- Else, use offline order flow

---

## A) Database schema updates (SQL)

Use this as a migration applied to Supabase (or merge into `server/db/schema.sql`).

```sql
-- Users
create table if not exists users (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  name text not null,
  email text not null unique,
  phone text null,

  email_verified_at timestamptz null,
  phone_verified_at timestamptz null,

  password_hash text null
);

-- OTP codes
create table if not exists otp_codes (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  user_id bigint not null references users(id) on delete cascade,
  otp_hash text not null,
  otp_salt text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null
);

create index if not exists idx_otp_user_expires on otp_codes (user_id, expires_at desc);

-- Career applications
create table if not exists career_applications (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  user_id bigint null references users(id) on delete set null,

  position text not null,
  payload jsonb not null,

  resume_path text null,
  cv_path text null,

  status text not null default 'submitted' check (status in ('submitted','reviewing','shortlisted','rejected','hired'))
);

create index if not exists idx_careers_created on career_applications (created_at desc);

-- Orders (offline-first)
-- If you keep the existing orders table, add a user_id + status column and keep payment_status for future.
alter table orders add column if not exists user_id bigint null;
alter table orders add column if not exists status text not null default 'Pending';

-- Optional: constrain to known statuses
-- alter table orders add constraint orders_status_check check (status in ('Pending','Approved','In Progress','Completed'));

-- Invoices
-- existing invoices table is fine; ensure invoice creation is allowed by admin
```

---

## B) OTP verification flow (API outline)

Endpoints:
- POST `/api/auth/otp/request` { phone }
- POST `/api/auth/otp/verify` { phone, otp }

Rules:
- Require authenticated user OR create user by phone/email first
- Store OTP hash + expiry
- On success: set `phone_verified_at = now()`

---

## C) Supabase Storage setup

1) Create bucket: `resumes`
2) Private bucket recommended
3) Use signed upload URLs

Env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)

---

## D) SMS provider integration example (MSG91 outline)

Use Node 18+ `fetch`.

```ts
export async function sendOtpSms({ phoneE164, otp }: { phoneE164: string; otp: string }) {
  const url = "https://api.msg91.com/api/v5/otp";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authkey": process.env.MSG91_AUTH_KEY!
    },
    body: JSON.stringify({
      mobile: phoneE164.replace(/^\+/, ""),
      otp,
      template_id: process.env.MSG91_TEMPLATE_ID
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MSG91 failed: ${res.status} ${text}`);
  }
}
```

---

## E) Invoice generation example (manual)

- Admin endpoint: POST `/api/admin/orders/:id/invoice`
  - Inserts invoice record if missing
- Download endpoint: GET `/api/invoice/:orderId`
  - Allowed if owner/admin AND invoice exists

PDF generation can continue using PDFKit (already in repo).

---

## F) Deployment checklist (India)

- Backend runs behind HTTPS (Railway/Render/VPS + reverse proxy)
- Set strict `CORS_ORIGINS` to Vercel domain(s)
- Use Supabase Session Pooler (IPv4) connection string
- Keep service-role key only in backend env
- Rotate JWT secret; set `NODE_ENV=production`
- Enable separate rate limits for OTP endpoints
- Email: verify domain in Resend; configure SPF/DKIM
- SMS: DLT compliance (India) with template IDs (MSG91)

