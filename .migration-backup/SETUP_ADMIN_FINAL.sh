#!/bin/bash

# ============================================
# ADMIN PRINCIPAL SETUP - FINAL COMPLETE GUIDE
# ============================================

PROJECT_ID="kaddsojhnkyfavaulrfc"
DASHBOARD_URL="https://app.supabase.com/project/${PROJECT_ID}/sql/editor"
USER_EMAIL="ahdybau@gmail.com"

clear

cat << 'BANNER'
╔════════════════════════════════════════════════════════════╗
║           👑 CREATING ADMIN PRINCIPAL                      ║
║                                                             ║
║   Email: ahdybau@gmail.com                                 ║
║   Role: admin_principal                                    ║
║   Status: Setting up...                                    ║
╚════════════════════════════════════════════════════════════╝
BANNER

echo ""
echo "📋 SETUP INSTRUCTIONS (3 STEPS - 2 MINUTES)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ STEP 1: Open Supabase SQL Editor"
echo "   URL: $DASHBOARD_URL"
echo ""
echo "   OR:"
echo "   1. Go to: https://app.supabase.com"
echo "   2. Select project: kaddsojhnkyfavaulrfc"
echo "   3. Click 'SQL Editor' (left menu)"
echo "   4. Click 'New Query'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ STEP 2: Copy & Paste THIS ENTIRE BLOCK into the editor:"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""

# The actual migration SQL
cat << 'MIGRATION'
-- Complete Admin Principal Setup
-- This creates the admin_principal role and assigns it to ahdybau@gmail.com

DO $$
DECLARE
  admin_user_id uuid;
  v_user_email text := 'ahdybau@gmail.com';
  admin_count integer;
BEGIN
  RAISE NOTICE 'Starting Admin Principal Setup...';

  -- Step 1: Add enum values if missing
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
    RAISE NOTICE 'Added admin_principal to enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'admin_principal already in enum';
  END;

  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';
    RAISE NOTICE 'Added moderator to enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'moderator already in enum';
  END;

  -- Step 2: Find the user
  SELECT id INTO admin_user_id FROM auth.users 
  WHERE email = v_user_email LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found!', v_user_email;
  END IF;

  RAISE NOTICE 'Found user with ID: %', admin_user_id;

  -- Step 3: Clean old roles
  DELETE FROM public.user_roles WHERE user_id = admin_user_id;
  RAISE NOTICE 'Cleaned up old roles';

  -- Step 4: Insert admin_principal role
  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (
    admin_user_id,
    'admin_principal'::public.app_role,
    NOW(),
    NOW()
  );

  RAISE NOTICE '✅ Successfully set admin_principal role!';

END $$;

-- Verify the setup
SELECT 
  u.id,
  u.email,
  ur.role,
  NOW() as setup_time
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
MIGRATION

echo ""
echo "════════════════════════════════════════════════════════"
echo ""

echo "✅ STEP 3: Execute the SQL"
echo "   1. Make sure all the SQL above is selected"
echo "   2. Click the blue 'RUN' or 'Execute' button"
echo "   3. Wait for the result..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 EXPECTED RESULT:"
echo ""
echo "   id                                  | email             | role            "
echo "   ────────────────────────────────────┼───────────────────┼─────────────────"
echo "   54f77d49-1ab0-4e72-8a54-bcf...      | ahdybau@gmail.com | admin_principal "
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔄 FINAL STEPS (Return to your app):"
echo ""
echo "1. Sign out completely"
echo "2. Clear browser cache (Ctrl+Shift+Delete)"
echo "3. Sign back in with: $USER_EMAIL"
echo "4. Click 'Admin' in the navigation menu"
echo "5. You should now see all 12 admin tabs! ✨"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Files Created:"
echo "   • /supabase/migrations/20260216_complete_admin_principal_setup.sql"
echo ""
echo "✅ Status: Ready for execution!"
echo ""
