-- Apply all high-priority admin / RLS fixes (idempotent)
-- Safe to run multiple times. Designed to repair: enum values, user_permissions,
-- key helper functions, and to replace legacy policies that relied on has_role('admin').
-- Run this in Supabase SQL Editor (or via service role key / apply-migrations.mjs).

BEGIN;

-- 1) Ensure enum values exist
DO $$BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_principal' BEFORE 'admin';
EXCEPTION WHEN undefined_object THEN
  -- Older Postgres may not support IF NOT EXISTS on ALTER TYPE; ignore
  NULL;
END$$;

DO $$BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator' AFTER 'admin';
EXCEPTION WHEN undefined_object THEN
  NULL;
END$$;

-- 2) Create user_permissions table + helpers (idempotent)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'admin'::public.app_role,
  permission public.user_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- Only create enum type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_permission') THEN
    CREATE TYPE public.user_permission AS ENUM (
      'manage_readings',
      'manage_contacts',
      'view_contacts',
      'create_notifications',
      'manage_gallery',
      'manage_pages'
    );
  END IF;
END$$;

-- Functions: has_permission, has_any_permission, get_user_permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission public.user_permission)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = _user_id AND up.permission = _permission
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin_principal'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_permission(_user_id uuid, _permissions public.user_permission[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = _user_id AND up.permission = ANY(_permissions)
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin_principal'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission public.user_permission) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT permission FROM public.user_permissions WHERE user_id = _user_id;
$$;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User permissions - owner" ON public.user_permissions;
CREATE POLICY "User permissions - owner" ON public.user_permissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin_principal'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin_principal'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, public.user_permission) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_permission(uuid, public.user_permission[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;

-- 3) Ensure role helper functions exist (is_main_admin, is_admin, is_admin_or_moderator)
CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin_principal');
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin_principal','admin'));
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin_principal','admin','moderator'));
$$;

-- 4) Replace legacy has_role('admin') policies with public.is_admin(auth.uid())
-- Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- User roles: only admin_principal can manage roles
DROP POLICY IF EXISTS "Only admin_principal can manage roles" ON public.user_roles;
CREATE POLICY "Only admin_principal can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_main_admin(auth.uid()));

-- Gallery images table
DROP POLICY IF EXISTS "Admins can manage gallery" ON public.gallery_images;
CREATE POLICY "Admins can manage gallery" ON public.gallery_images FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Storage: storage.objects (gallery bucket)
DROP POLICY IF EXISTS "Admins can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON storage.objects;
CREATE POLICY "Admins can upload gallery images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete gallery images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND public.is_admin(auth.uid()));

-- FAQ / activities / page_content
DROP POLICY IF EXISTS "Admins can manage FAQ" ON public.faq_items;
CREATE POLICY "Admins can manage FAQ" ON public.faq_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;
CREATE POLICY "Admins can manage activities" ON public.activities FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage page content" ON public.page_content;
CREATE POLICY "Admins can manage page content" ON public.page_content FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Biblical readings (allow admins to manage)
DROP POLICY IF EXISTS "Admins can manage readings" ON public.biblical_readings;
CREATE POLICY "Admins can manage readings" ON public.biblical_readings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Contacts: admins can view/delete
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contacts;
CREATE POLICY "Admins can view contact messages" ON public.contacts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contacts;
CREATE POLICY "Admins can manage contact messages" ON public.contacts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Notifications (admins can create/read)
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 5) Fix user_roles RLS so authenticated users can read/update their own roles (helps auto-fix flows)
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own roles" ON public.user_roles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_roles TO authenticated;

-- 6) Ensure main admin (ahdybau@gmail.com) is set to admin_principal (bypass RLS safely)
DO $$
DECLARE
  admin_user_id uuid;
  v_user_email text := 'ahdybau@gmail.com';
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = v_user_email LIMIT 1;
  IF admin_user_id IS NOT NULL THEN
    -- Insert or ensure admin_principal exists for this user
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (admin_user_id, 'admin_principal'::public.app_role, NOW(), NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END$$;

COMMIT;

-- Final helpful SELECT (non-destructive) to verify
SELECT u.email, ur.role FROM auth.users u LEFT JOIN public.user_roles ur ON u.id = ur.user_id WHERE u.email = 'ahdybau@gmail.com';
