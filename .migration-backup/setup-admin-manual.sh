#!/bin/bash

# Ultra Simple Admin Principal Setup
# Just copy-paste the SQL below into Supabase Dashboard

PROJECT_ID="kaddsojhnkyfavaulrfc"
DASHBOARD_URL="https://app.supabase.com/project/${PROJECT_ID}/sql/editor"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      👑 ADMIN PRINCIPAL SETUP - COPY-PASTE SOLUTION       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📱 STEP 1: Open this URL"
echo "   $DASHBOARD_URL"
echo ""
echo "➕ STEP 2: Click 'New Query'"
echo ""
echo "📋 STEP 3: Copy-paste EVERYTHING below into the editor:"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Read and show the migration SQL
cat << 'SQL'
-- Admin Principal Complete Setup
DO $$
DECLARE
  admin_user_id uuid;
  v_user_email text := 'ahdybau@gmail.com';
  admin_count integer;
BEGIN
  -- Add enum values
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- Find user
  SELECT id INTO admin_user_id FROM auth.users WHERE email = v_user_email LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found!';
  END IF;

  -- Clean and insert role
  DELETE FROM public.user_roles WHERE user_id = admin_user_id;
  
  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (admin_user_id, 'admin_principal'::public.app_role, NOW(), NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE '✅ SUCCESS! Admin Principal is now active for %', v_user_email;
END $$;

-- Verify
SELECT 
  u.email,
  ur.role,
  '✅ ADMIN PRINCIPAL' as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
SQL

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "▶️  STEP 4: Click 'Execute' button"
echo ""
echo "✅ STEP 5: You should see:"
echo "    email: ahdybau@gmail.com"
echo "    role: admin_principal"
echo "    status: ✅ ADMIN PRINCIPAL"
echo ""
echo "🔄 STEP 6: Go back to your app and:"
echo "   1. Sign out completely"
echo "   2. Clear cache (Ctrl+Shift+Delete)"
echo "   3. Sign back in"
echo "   4. Click Admin → All 12 tabs should appear! 🎉"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📖 Full migration file: /supabase/migrations/20260216_complete_admin_principal_setup.sql"
echo ""
