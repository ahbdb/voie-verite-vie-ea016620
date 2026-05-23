-- Complete Role-Based Access Control (RBAC) for Admin Pages
-- This migration defines clear permissions for admin_principal, admin, and moderator roles

-- ============================================================================
-- ROLE HIERARCHY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin_principal'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_principal', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_principal', 'admin', 'moderator')
  )
$$;

-- ============================================================================
-- PROFILES TABLE - Permissions:
-- - admin_principal: FULL (CRUD)
-- - admin: READ all, UPDATE own
-- - moderator: READ own
-- - user: READ own
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- USER_ROLES TABLE - Permissions:
-- - admin_principal: FULL (CRUD)
-- - admin: READ all, CANNOT manage
-- - moderator: READ own
-- - user: READ own
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admin_principal can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_main_admin(auth.uid()));

-- ============================================================================
-- BIBLICAL_READINGS TABLE - Permissions:
-- - admin_principal: FULL (CRUD)
-- - admin: CRUD (can manage readings)
-- - moderator: READ only
-- - user: READ only
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view readings" ON public.biblical_readings;
DROP POLICY IF EXISTS "Admins can manage readings" ON public.biblical_readings;

CREATE POLICY "Anyone can view readings"
ON public.biblical_readings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage readings"
ON public.biblical_readings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- CONTACTS TABLE - Permissions:
-- - admin_principal: FULL (CRUD)
-- - admin: READ, DELETE
-- - moderator: READ only
-- - user: NONE (can only CREATE their own)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contacts;
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contacts;

CREATE POLICY "Anyone can submit contact messages"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view contact messages"
ON public.contacts FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage contact messages"
ON public.contacts FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- NOTIFICATIONS TABLE - Permissions:
-- - admin_principal: FULL (CRUD)
-- - admin: CREATE, READ all
-- - user: READ own, UPDATE own, DELETE own
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can manage notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- AI_CONVERSATIONS TABLE - Permissions:
-- - admin_principal: FULL (CRUD)
-- - admin: manage all conversations
-- - user: READ/WRITE own conversations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.ai_conversations;

CREATE POLICY "Users can view their own conversations"
ON public.ai_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
ON public.ai_conversations FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create conversations"
ON public.ai_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.ai_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- PERMISSIONS SUMMARY
-- ============================================================================
-- 👑 ADMIN PRINCIPAL: Full access to everything
-- 🔐 ADMIN: Can CREATE/READ/UPDATE/DELETE readings, contact messages, users (except roles)
-- 📋 MODERATOR: Can READ most things, LIMITED modifications
-- 👤 USER: Can READ their own data, CREATE notifications
-- ============================================================================
