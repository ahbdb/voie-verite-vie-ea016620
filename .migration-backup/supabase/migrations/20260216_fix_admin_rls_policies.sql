-- Fix RLS policies for admin_principal role
-- First, ensure the is_admin function exists
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

-- Drop the old policy that checks for exact 'admin' role
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policy that uses the is_admin function (checks for both admin_principal and admin)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Also ensure user_roles can be viewed properly
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));
