-- Fix circular RLS issue for superadmin ahdybau@gmail.com
-- The user exists but cannot insert admin_principal role due to RLS
-- Using DO block to insert role directly (bypasses RLS)

DO $$
DECLARE
  admin_user_id uuid;
  user_email text := 'ahdybau@gmail.com';
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO admin_user_id FROM auth.users 
  WHERE email = user_email 
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user: % (ID: %)', user_email, admin_user_id;
    
    -- Delete any existing roles (the old way to ensure clean state)
    DELETE FROM public.user_roles 
    WHERE user_id = admin_user_id;
    
    RAISE NOTICE 'Cleaned existing roles';
    
    -- Insert admin_principal role directly
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (
      admin_user_id,
      'admin_principal'::public.app_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Successfully set admin_principal role for %', user_email;
    
    -- Verify the role was set
    IF EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = admin_user_id
        AND role = 'admin_principal'::public.app_role
    ) THEN
      RAISE NOTICE '✅ Verification SUCCESS: admin_principal role is now active';
    ELSE
      RAISE WARNING '❌ Verification FAILED: admin_principal role was not set';
    END IF;
  ELSE
    RAISE WARNING 'User % not found in auth.users!', user_email;
  END IF;
END $$;

-- Clear cache for next authentication
SELECT NOW() as migration_completed;
