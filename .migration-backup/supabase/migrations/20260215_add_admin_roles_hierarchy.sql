-- Add admin role hierarchy
-- This migration adds support for different admin levels: admin_principal, admin, and moderator

-- Alter the existing enum to include new roles
ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';

-- Update the has_role function to support the new roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin (admin_principal or admin)
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
    WHERE user_id = _user_id
      AND role IN ('admin_principal', 'admin')
  )
$$;

-- Function to check if user is main admin
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
    WHERE user_id = _user_id
      AND role = 'admin_principal'
  )
$$;

-- Update existing policies to use is_admin function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage readings" ON public.biblical_readings;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage readings"
ON public.biblical_readings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Set initial admin_principal for ahdybau@gmail.com if admin role exists
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID for ahdybau@gmail.com
  SELECT id INTO admin_user_id FROM auth.users 
  WHERE email = 'ahdybau@gmail.com' 
  LIMIT 1;

  -- If the user exists and has admin role, update to admin_principal
  IF admin_user_id IS NOT NULL THEN
    -- Delete old admin role if it exists
    DELETE FROM public.user_roles 
    WHERE user_id = admin_user_id 
      AND role = 'admin'::app_role;
    
    -- Insert admin_principal role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin_principal'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin principal role set for ahdybau@gmail.com';
  END IF;
END $$;
