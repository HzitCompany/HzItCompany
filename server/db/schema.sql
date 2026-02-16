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
