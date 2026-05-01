-- Complete Admin Principal Setup
-- Created: 2026-02-16
-- Purpose: Create admin_principal role type and assign it to ahdybau@gmail.com
-- Status: DO BLOCK WITH EXCEPTION HANDLING (safe to re-run)

DO $$
DECLARE
  admin_user_id uuid;
  v_user_email text := 'ahdybau@gmail.com';
  admin_count integer;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADMIN PRINCIPAL SETUP - START';
  RAISE NOTICE '========================================';

  -- Step 1: Add enum values if they don't exist
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
    RAISE NOTICE '✅ Added admin_principal to enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️  admin_principal already in enum';
  END;

  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';
    RAISE NOTICE '✅ Added moderator to enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️  moderator already in enum';
  END;

  -- Step 2: Find the user
  SELECT id INTO admin_user_id FROM auth.users 
  WHERE email = v_user_email 
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users!', v_user_email;
  END IF;

  RAISE NOTICE '✅ Found user: % (ID: %)', v_user_email, admin_user_id;

  -- Step 3: Clean up any old roles
  DELETE FROM public.user_roles 
  WHERE user_id = admin_user_id;

  RAISE NOTICE '✅ Cleaned up old roles';

  -- Step 4: Insert admin_principal role
  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (
    admin_user_id,
    'admin_principal'::public.app_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE '✅ Inserted admin_principal role';

  -- Step 5: Verify
  SELECT COUNT(*) INTO admin_count FROM public.user_roles
  WHERE user_id = admin_user_id 
    AND role = 'admin_principal'::public.app_role;

  IF admin_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SUCCESS! Admin Principal Setup Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User: %', v_user_email;
    RAISE NOTICE 'Role: admin_principal';
    RAISE NOTICE 'Status: ACTIVE ✅';
  ELSE
    RAISE EXCEPTION 'Failed to set admin_principal role!';
  END IF;

END $$;

-- Final verification query
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  ur.role as user_role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role = 'admin_principal'::public.app_role THEN '👑 ADMIN PRINCIPAL'
    WHEN ur.role = 'admin'::public.app_role THEN '🔧 ADMIN'
    ELSE '👤 USER'
  END as role_label
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com'
ORDER BY ur.role DESC;
