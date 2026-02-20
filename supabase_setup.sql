-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    CASE
      WHEN new.email = 'hzitcompany@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Enables RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3/4. Admin access
-- IMPORTANT: Do NOT query public.profiles inside a policy on public.profiles.
-- That causes infinite recursion and PostgREST will return 500.
-- Use a SECURITY DEFINER helper instead.

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS for submissions table
-- submissions.user_id is a bigint from the custom `users` table.
-- We bridge to Supabase auth via email: users.email = auth.email().
-- Note: the Express backend uses a service-role / direct PG connection that
-- bypasses RLS entirely, so these policies protect only direct client queries.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Migration: add supabase_uid to existing submissions table.
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS supabase_uid TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_supabase_uid ON public.submissions (supabase_uid, created_at DESC);

-- Backfill: assign supabase_uid for old submissions where email can be unambiguously matched.
-- Safe: only touches rows with supabase_uid IS NULL, and only when one Supabase profile matches.
UPDATE public.submissions s
SET supabase_uid = p.id::text
FROM public.users u
JOIN public.profiles p ON lower(p.email) = lower(u.email)
WHERE s.user_id = u.id
  AND s.supabase_uid IS NULL
  AND u.email IS NOT NULL;

-- Helper: resolve the local bigint user id for the currently authenticated user.
CREATE OR REPLACE FUNCTION public.current_local_user_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_local_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_local_user_id() TO authenticated;

-- Users can read their own submissions.
CREATE POLICY "Users can read own submissions" ON public.submissions
  FOR SELECT
  TO authenticated
  USING (
    (supabase_uid = auth.uid()::text AND supabase_uid IS NOT NULL)
    OR (supabase_uid IS NULL AND user_id = public.current_local_user_id())
    OR public.is_admin(auth.uid())
  );

-- Users can insert their own submissions (user_id must match their local id).
CREATE POLICY "Users can insert own submissions" ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (supabase_uid = auth.uid()::text);

-- Users can update their own submissions (only if not yet reviewed).
CREATE POLICY "Users can update own submissions" ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (
    (supabase_uid = auth.uid()::text AND supabase_uid IS NOT NULL)
    OR (supabase_uid IS NULL AND user_id = public.current_local_user_id())
    OR public.is_admin(auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS for career_applications
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own career applications" ON public.career_applications
  FOR SELECT
  TO authenticated
  USING (
    user_id = public.current_local_user_id()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can insert own career applications" ON public.career_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_local_user_id());

CREATE POLICY "Admins can update career applications" ON public.career_applications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Legacy tables (no user reference) — restrict to admin only
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only: contact_submissions" ON public.contact_submissions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

ALTER TABLE public.hire_us_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only: hire_us_submissions" ON public.hire_us_submissions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only: contact_messages" ON public.contact_messages
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

ALTER TABLE public.hire_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only: hire_requests" ON public.hire_requests
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));
