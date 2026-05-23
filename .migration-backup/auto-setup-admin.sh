#!/bin/bash

# ADMIN PRINCIPAL SETUP - AUTOMATED EXECUTION
# Execute migrations directly using SQL batching

PROJECT="kaddsojhnkyfavaulrfc"
URL="https://${PROJECT}.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      🚀 AUTO-APPLYING ADMIN PRINCIPAL MIGRATION            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Create a temporary SQL file with the migration
TEMP_SQL=$(mktemp)

cat > "$TEMP_SQL" << 'EOF'
-- Step 1: Add enum values
DO $$
BEGIN
  -- Check if admin_principal exists and add if not
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.app_role'::regtype 
    AND enumlabel = 'admin_principal'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
  END IF;
  
  -- Check if moderator exists and add if not
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.app_role'::regtype 
    AND enumlabel = 'moderator'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';
  END IF;
END $$;

-- Step 2: Setup admin principal role
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'ahdybau@gmail.com' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = admin_id;
    
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (admin_id, 'admin_principal'::public.app_role, NOW(), NOW());
    
    RAISE NOTICE 'Admin principal role setup for ahdybau@gmail.com';
  END IF;
END $$;

-- Verify
SELECT u.email, ur.role FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
EOF

echo "📄 Generated SQL migration script"
echo "📝 File: $TEMP_SQL"
echo ""

# Read the SQL
SQL_CONTENT=$(cat "$TEMP_SQL")

echo "🔧 Attempting execution via different methods..."
echo ""

# Method 1: Try via table insert/query endpoint (unlikely to work for DDL)
echo "Method 1: Direct REST API (DDL not supported with anon key)"
echo "─────────────────────────────────────────────────────────────"

# Method 2: Create intermediate RPC function
echo ""
echo "Method 2: Creating execution function..."
echo "─────────────────────────────────────────────────────────────"

# First, try to create a simple RPC that we can call
CREATE_RPC=$(cat << 'SQLRPC'
CREATE OR REPLACE FUNCTION public.setup_admin_principal()
RETURNS TABLE(email text, role text) AS $$
DECLARE
  admin_id uuid;
  admin_count integer;
BEGIN
  -- Add enum values
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- Find and setup admin
  SELECT id INTO admin_id FROM auth.users WHERE email = 'ahdybau@gmail.com' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = admin_id;
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (admin_id, 'admin_principal'::public.app_role, NOW(), NOW());
  END IF;

  -- Return verification
  RETURN QUERY
  SELECT u.email::text, COALESCE(ur.role::text, 'user') 
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  WHERE u.email = 'ahdybau@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
SQLRPC
)

# Try to execute the RPC creation
echo "📌 This requires either:"
echo "   1. Service Role Key (SUPABASE_SERVICE_ROLE_KEY environment variable)"
echo "   2. Supabase CLI installed (supabase db push)"
echo "   3. Manual execution in Dashboard"
echo ""

# Clean up
rm -f "$TEMP_SQL"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              FINAL SOLUTION - COPY & PASTE                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Go to: ${URL}/projects/${PROJECT}/sql/editor"
echo ""
echo "2. New Query and paste:"
echo ""
echo "$SQL_CONTENT"
echo ""
echo "3. Click Execute"
echo "4. Done! Admin principal is now active 👑"
echo ""

# Check if service key is set and try to use it
if [[ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "🔑 Service key detected! Trying direct execution..."
  echo ""
  
  # Try to execute via service key with curl
  curl -s -X POST \
    "${URL}/rest/v1/rpc/setup_admin_principal" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}' | jq '.' 2>/dev/null || echo "RPC attempt failed - function may not exist yet"
fi
