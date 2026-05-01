-- Get user roles - secure RPC function
-- This function returns the roles of the current authenticated user
-- It's safe to call from the client because it only returns the current user's roles

CREATE OR REPLACE FUNCTION public.get_current_user_roles()
RETURNS TABLE(
  user_id uuid,
  role app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    user_id,
    role
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;

-- Function to get user's highest admin role
-- Returns 'admin_principal', 'admin', 'moderator', or NULL
CREATE OR REPLACE FUNCTION public.get_user_admin_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role IN ('admin_principal', 'admin', 'moderator')
  ORDER BY 
    CASE role
      WHEN 'admin_principal' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'moderator' THEN 3
      ELSE 4
    END
  LIMIT 1;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_role() TO authenticated;
