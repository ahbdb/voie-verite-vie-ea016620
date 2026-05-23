-- Fix superadmin role - upgrade from 'user' to 'admin_principal'
-- This function upgrades the superadmin role automatically

CREATE OR REPLACE FUNCTION public.fix_superadmin_role()
RETURNS TABLE(
  user_id uuid,
  old_role app_role,
  new_role app_role,
  success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_old_role app_role;
  v_email text := 'ahdybau@gmail.com';
BEGIN
  -- Find the superadmin user
  SELECT id INTO v_user_id FROM auth.users 
  WHERE email = v_email 
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found', v_email;
  END IF;

  -- Get their current role
  SELECT role INTO v_old_role FROM public.user_roles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_old_role IS NULL THEN
    -- No role exists, insert admin_principal
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (v_user_id, 'admin_principal'::public.app_role, NOW(), NOW());
    
    RETURN QUERY SELECT 
      v_user_id AS user_id, 
      NULL::app_role AS old_role, 
      'admin_principal'::app_role AS new_role, 
      true AS success;
  ELSE
    -- Update existing role to admin_principal
    UPDATE public.user_roles 
    SET role = 'admin_principal'::public.app_role, updated_at = NOW()
    WHERE public.user_roles.user_id = v_user_id;
    
    RETURN QUERY SELECT 
      v_user_id AS user_id, 
      v_old_role AS old_role, 
      'admin_principal'::app_role AS new_role, 
      true AS success;
  END IF;
END $$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.fix_superadmin_role() TO authenticated;
