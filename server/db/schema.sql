-- HZ IT Company lead capture schema (Postgres)

-- Spec-required tables
drop view if exists contact_messages;
drop view if exists hire_requests;

create table if not exists contact_messages (
  id serial primary key,
  name text,
  email text,
  phone text,
  message text,
  created_at timestamp default now()
);

create table if not exists hire_requests (
  id serial primary key,
  name text,
  email text,
  service text,
  budget text,
  details text,
  created_at timestamp default now()
);

create table if not exists contact_submissions (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  name text not null,
  email text not null,
  phone text null,
  subject text not null,
  message text not null,

  ip inet null,
  user_agent text null,
  referer text null
);

create table if not exists hire_us_submissions (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  name text not null,
  email text not null,
  phone text not null,
  company text null,

  services text[] not null,
  project_name text not null,
  project_description text not null,
  budget text not null,
  timeline text not null,
  reference_url text null,
  additional_notes text null,

  ip inet null,
  user_agent text null,
  referer text null
);

create index if not exists idx_contact_created_at on contact_submissions (created_at desc);
create index if not exists idx_hire_created_at on hire_us_submissions (created_at desc);

-- Pricing
create table if not exists services_pricing (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  service_key text not null,
  service_name text not null,
  plan_key text not null,
  plan_name text not null,
  price_inr integer not null check (price_inr > 0),

  is_active boolean not null default true,
  sort_order integer not null default 0,

  unique (service_key, plan_key)
);

create index if not exists idx_services_pricing_active on services_pricing (is_active, sort_order, service_key);

-- Users (email + phone)
create table if not exists users (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  name text null,
  email text null,
  phone text null,

  is_verified boolean not null default false,
  password_hash text null
);

-- Allow nullable emails while keeping uniqueness for non-null emails.
do $$
begin
  -- If the legacy unique constraint exists, drop it and replace with a partial unique index.
  if exists (
    select 1
    from pg_constraint
    where conname = 'users_email_key'
  ) then
    alter table users drop constraint users_email_key;
  end if;
exception
  when undefined_table then
    -- ignore
end $$;

create unique index if not exists idx_users_email_unique_not_null on users (email) where email is not null;

create unique index if not exists idx_users_phone_unique on users (phone) where phone is not null;

-- Sessions (hashed JWT) for OTP-authenticated flows.
create table if not exists sessions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id bigint not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz null
);

create index if not exists idx_sessions_user_expires on sessions (user_id, expires_at desc);
create index if not exists idx_sessions_expires on sessions (expires_at desc);

-- Unified submissions
create table if not exists submissions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id bigint not null references users(id) on delete cascade,
  type text not null check (type in ('contact','hire','career')),
  data jsonb not null
);

create index if not exists idx_submissions_user_created_at on submissions (user_id, created_at desc);
create index if not exists idx_submissions_type_created_at on submissions (type, created_at desc);

-- OTP codes
create table if not exists otp_codes (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  user_id bigint not null references users(id) on delete cascade,
  channel text not null default 'sms' check (channel in ('sms','email')),
  destination text null,
  otp_hash text not null,
  otp_salt text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null
);

create index if not exists idx_otp_user_expires on otp_codes (user_id, expires_at desc);
create index if not exists idx_otp_user_channel_expires on otp_codes (user_id, channel, expires_at desc);

-- Clients
create table if not exists clients (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  email text not null unique,
  password_hash text not null
);

-- Admin users
create table if not exists admin_users (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  email text not null unique,
  name text null,
  is_active boolean not null default true
);

-- Orders
create table if not exists orders (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  name text not null,
  email text not null,
  service_key text not null,
  service_name text not null,
  plan_key text not null,
  plan_name text not null,
  price_inr integer not null check (price_inr > 0),

  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  razorpay_order_id text null,
  razorpay_payment_id text null,
  razorpay_signature text null,

  project_status text not null default 'received' check (project_status in ('received','in_progress','blocked','delivered','closed'))
);

create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_email on orders (email);
create unique index if not exists idx_orders_razorpay_payment_id on orders (razorpay_payment_id) where razorpay_payment_id is not null;

-- Invoices
create table if not exists invoices (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  order_id bigint not null references orders(id) on delete cascade,
  invoice_number text not null unique,
  issued_at timestamptz not null default now()
);

create unique index if not exists idx_invoices_order_id on invoices (order_id);

-- Site content (simple CMS)
create table if not exists site_content (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null unique,
  value jsonb not null
);
