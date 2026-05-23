-- Fix insecure/insufficient profile access policies
-- 1) Remove unsafe policy that currently allows every authenticated user to read all profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;

-- 2) Ensure admins can still view all profiles
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin_principal'::public.app_role, 'admin'::public.app_role])
  )
);

-- 3) Allow each user to read/update/insert only their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Biblical readings should be visible to all app users (public-facing feature)
CREATE POLICY "Public can read biblical readings"
ON public.biblical_readings
FOR SELECT
USING (true);