#!/bin/bash

# ADMIN SETUP - SERVICE ROLE KEY REQUIRED
# This script needs the Supabase Service Role Key to create users

PROJECT_ID="kaddsojhnkyfavaulrfc"
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"
EMAIL="ahdybau@gmail.com"

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  🔑 SERVICE ROLE KEY REQUIRED                             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "To complete automatic setup, you need your Service Role Key:"
    echo ""
    echo "1. Go to: https://app.supabase.com/project/${PROJECT_ID}/settings/api"
    echo "2. Under 'Project API keys', find 'service_role' (NOT 'anon')"
    echo "3. Copy the key"
    echo "4. Run:"
    echo ""
    echo "   export SUPABASE_SERVICE_ROLE_KEY='your-key-here'"
    echo "   bash setup-service.sh"
    echo ""
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 CREATING ADMIN USER - AUTOMATIC SETUP                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Generate random password
PASSWORD=$(openssl rand -base64 16 | tr -d '=' | cut -c1-16)

echo "📝 Creating user: $EMAIL"
echo "🔐 Password: $PASSWORD (save this for first login)"
echo ""

# Step 2: Use Supabase Admin API to create user
echo "🔄 Creating user in Supabase Auth..."

USER_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"name\": \"Admin Principal\",
      \"role\": \"admin_principal\"
    }
  }")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [[ -z "$USER_ID" ]]; then
    echo "❌ Failed to create user. Response:"
    echo "$USER_RESPONSE"
    exit 1
fi

echo "✅ User created! ID: $USER_ID"
echo ""

# Step 3: Insert into profiles
echo "📝 Creating profile..."

curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/profiles" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${USER_ID}\",
    \"email\": \"${EMAIL}\"
  }" > /dev/null

echo "✅ Profile created"
echo ""

# Step 4: Insert admin_principal role
echo "👑 Setting admin_principal role..."

curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/user_roles" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"${USER_ID}\",
    \"role\": \"admin_principal\"
  }" > /dev/null

echo "✅ Role assigned"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✨ SETUP COMPLETE!                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 NEXT STEPS:"
echo ""
echo "1️⃣  Go to your app: https://voie-verite-vie.vercel.app"
echo "2️⃣  Sign in with:"
echo "    Email: ${EMAIL}"
echo "    Password: ${PASSWORD}"
echo ""
echo "3️⃣  You should see: Admin section with all tabs 👑"
echo ""
