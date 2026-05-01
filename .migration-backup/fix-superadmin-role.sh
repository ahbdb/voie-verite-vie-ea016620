#!/bin/bash
# Fix superadmin role directly via SQL

# Load environment variables
source .env.local 2>/dev/null || source .env 2>/dev/null

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_KEY="${VITE_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set"
  exit 1
fi

echo "🔍 Looking for superadmin user..."

# Query the user ID using the REST API
USER_ID=$(curl -s \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/user_roles?user_id=in.(select id from auth.users where email='ahdybau@gmail.com')" \
  | jq -r '.[0].user_id // empty')

echo "Found user: $USER_ID"

if [ -z "$USER_ID" ]; then
  echo "❌ Superadmin user not found"
  exit 1
fi

echo "✅ Superadmin found: $USER_ID"
echo "🔄 Updating role to admin_principal..."

# Delete old roles
curl -s -X DELETE \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/user_roles?user_id=eq.$USER_ID&role=in.(admin,moderator)" \
  -d '{}' > /dev/null

# Insert new admin_principal role
curl -s -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/user_roles" \
  -d "{\"user_id\": \"$USER_ID\", \"role\": \"admin_principal\"}" > /dev/null

echo "✅ Role updated to admin_principal!"
echo "📝 You may need to clear your browser cache and log out/in again"
