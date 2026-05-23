#!/bin/bash

# Ultra-simple admin setup
# Just run: bash quick-admin-setup.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ⚡ QUICK ADMIN SETUP FOR ahdybau@gmail.com              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not set"
    echo ""
    echo "📋 To use this script:"
    echo ""
    echo "1. Get your Service Role Key:"
    echo "   → Go to: https://app.supabase.com/project/kaddsojhnkyfavaulrfc/settings/api"
    echo "   → Copy the 'service_role' key (NOT 'anon')"
    echo ""
    echo "2. Set the variable:"
    echo "   export SUPABASE_SERVICE_ROLE_KEY='paste-the-key-here'"
    echo ""
    echo "3. Run this script:"
    echo "   bash quick-admin-setup.sh"
    echo ""
    exit 1
fi

PROJECT="kaddsojhnkyfavaulrfc"
URL="https://${PROJECT}.supabase.co"
EMAIL="ahdybau@gmail.com"
PASS=$(openssl rand -base64 12)

echo "🔄 Creating admin user...$"
echo ""

# Create user
RESPONSE=$(curl -s -X POST "${URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASS}\",
    \"email_confirm\": true,
    \"user_metadata\": {\"role\": \"admin_principal\"}
  }")

ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [[ -z "$ID" ]]; then
    echo "❌ Failed to create user"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ User created: $EMAIL"
echo "   ID: $ID"
echo ""

# Create profile
echo "📝 Setting up profile..."
curl -s -X POST "${URL}/rest/v1/profiles" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"id\":\"${ID}\",\"email\":\"${EMAIL}\"}" > /dev/null

# Create role
echo "👑 Assigning admin_principal role..."
curl -s -X POST "${URL}/rest/v1/user_roles" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"user_id\":\"${ID}\",\"role\":\"admin_principal\"}" > /dev/null

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✨ DONE!!               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Your Login Credentials:"
echo "   Email:    $EMAIL"
echo "   Password: $PASS"
echo ""
echo "🎯 Next:"
echo "   1. Go to: https://voie-verite-vie.vercel.app"
echo "   2. Sign in with the credentials above"
echo "   3. You'll see ADMIN section with all features! 🚀"
echo ""
