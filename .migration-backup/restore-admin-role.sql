-- Fix admin role for ahdybau@gmail.com
-- This script restores the admin_principal role

BEGIN;

-- Get the user ID from auth.users
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com' LIMIT 1
)
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM admin_user);

-- Insert admin_principal role
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com' LIMIT 1
)
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin_principal', NOW(), NOW() FROM admin_user;

COMMIT;

-- Verify the result
SELECT u.email, ur.role 
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
