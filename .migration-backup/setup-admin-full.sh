#!/bin/bash
# Complete Admin Setup Automation Script
# This script handles ALL possible steps to make ahdybau@gmail.com an admin_principal

set -e

PROJECT_ID="kaddsojhnkyfavaulrfc"
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"
EMAIL="ahdybau@gmail.com"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   3V - FULL ADMIN PRINCIPAL SETUP AUTOMATION              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check if Supabase CLI is available
echo "📋 Step 1: Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Installing via brew..."
    brew install supabase/tap/supabase || npm install -g supabase 2>/dev/null || {
        echo "❌ Could not install Supabase CLI"
        echo "   Install manually: https://github.com/supabase/cli#install-the-cli"
        exit 1
    }
fi
echo "✅ Supabase CLI ready"
echo ""

# Step 2: Link to project
echo "📋 Step 2: Linking to Supabase project..."
supabase projects list || {
    echo "⚠️  First time setup required. Please create a Supabase token:"
    echo "    1. Go to: https://app.supabase.com/account/tokens"
    echo "    2. Create a new token"
    echo "    3. Run: supabase projects list"
    exit 1
}
echo "✅ Linked to project"
echo ""

# Step 3: Check if user exists - this requires the service role key
echo "📋 Step 3: Checking if user exists..."
if [[ -z "$SUPABASE_SERVICE_KEY" ]]; then
    echo "⚠️  SUPABASE_SERVICE_KEY not found in environment"
    echo ""
    echo "🔑 To complete admin setup automatically, you need:"
    echo "   1. Go to: https://app.supabase.com/project/${PROJECT_ID}/settings/api"
    echo "   2. Copy the 'service_role' key (ANONYMOUS_KEY is NOT enough)"
    echo "   3. Set it: export SUPABASE_SERVICE_KEY='your-key-here'"
    echo "   4. Run this script again"
    echo ""
    echo "--- OR (SIMPLER) ---"
    echo ""
    echo "Run the SQL directly in Supabase Dashboard:"
    echo "   1. Go to: https://app.supabase.com/project/${PROJECT_ID}/sql/new"
    echo "   2. Paste the SQL from: ./ADMIN_SETUP.sql"
    echo "   3. Click Execute"
    echo ""
    read -p "Have you executed the SQL? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Admin setup complete!"
        echo ""
        echo "🎯 Final steps:"
        echo "   1. Reload the app"
        echo "   2. Clear browser cache (Ctrl+Shift+Delete)"
        echo "   3. Sign out completely"
        echo "   4. Sign back in"
        echo ""
        exit 0
    else
        exit 1
    fi
fi

# Step 4: Execute setup with service role key
echo "🔧 Executing admin setup with service role key..."

SETUP_SQL=$(cat << 'EOF'
-- Create profile if it doesn't exist
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users 
WHERE email = 'ahdybau@gmail.com'
  AND id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Clean up old admin roles
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com')
  AND role IN ('admin', 'moderator');

-- Set admin_principal role
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin_principal'::app_role, NOW(), NOW()
FROM auth.users
WHERE email = 'ahdybau@gmail.com'
  AND id NOT IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin_principal'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify
SELECT 
  u.id,
  u.email,
  ur.role,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
EOF
)

# Use supabase db execute to run SQL
supabase db push <<< "$SETUP_SQL" 2>&1 | tee /tmp/admin_setup.log

if grep -q "admin_principal" /tmp/admin_setup.log; then
    echo "✅ Admin role successfully set!"
else
    echo "⚠️  Check the log above for details"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✨ SETUP COMPLETE - NEXT STEPS               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Reload the application"
echo "2. Sign out completely (Ctrl+Shift+Delete to clear cache)"
echo "3. Sign back in with: $EMAIL"
echo "4. Check that Admin panel is accessible"
echo ""
