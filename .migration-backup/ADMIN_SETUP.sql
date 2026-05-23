-- ============================================
-- ADMIN PRINCIPAL SETUP - ahdybau@gmail.com
-- ============================================
-- Run this SQL in Supabase Dashboard > SQL Editor

-- Step 1: Create profile if user exists in auth.users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users 
WHERE email = 'ahdybau@gmail.com'
  AND id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Delete old admin roles (if any)
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com')
  AND role IN ('admin', 'moderator');

-- Step 3: Create admin_principal role
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin_principal'::app_role, NOW(), NOW()
FROM auth.users
WHERE email = 'ahdybau@gmail.com'
  AND id NOT IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin_principal'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Verify setup
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  u.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
