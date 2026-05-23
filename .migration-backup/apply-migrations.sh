#!/bin/bash

# Direct SQL Execution via Supabase API
# This script applies migrations by reading SQL files and executing them

PROJECT_ID="kaddsojhnkyfavaulrfc"
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"

MIGRATION_FILE="/workspaces/voie-verite-vie/supabase/migrations/20260216_complete_admin_principal_setup.sql"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    🔧 APPLYING ADMIN PRINCIPAL MIGRATION VIA API           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [[ ! -f "$MIGRATION_FILE" ]]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Reading migration: $MIGRATION_FILE"
MIGRATION_SQL=$(cat "$MIGRATION_FILE")

echo "📋 Migration SQL (first 500 chars):"
echo "─────────────────────────────────────"
echo "${MIGRATION_SQL:0:500}..."
echo "─────────────────────────────────────"
echo ""

# Try Method 1: Use Supabase pg_net extension via RPC
echo "🔧 Method 1: Trying Supabase RPC (exec_sql)..."
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(echo "$MIGRATION_SQL" | jq -Rs '.')}")

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "error\|Error"; then
    echo "⚠️  RPC method failed (expected - no exec_sql function)"
    echo ""
fi

# Try Method 2: Create a temporary edge function to execute SQL
echo "🔧 Method 2: Would require Edge Function (skipped)"
echo ""

# Show the migration content that needs to be executed
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            MIGRATION TO EXECUTE (Full SQL)                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "$MIGRATION_SQL"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  HOW TO APPLY THIS                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Option A: Manual Dashboard Execution"
echo "─────────────────────────────────────"
echo "1. Open: ${SUPABASE_URL}/projects/${PROJECT_ID}/sql/editor"
echo "2. Create New Query"
echo "3. Copy the SQL above"
echo "4. Click Execute"
echo ""

echo "Option B: Using Service Role Key"
echo "─────────────────────────────────────"
echo "If you set SUPABASE_SERVICE_ROLE_KEY environment variable:"
echo "  export SUPABASE_SERVICE_ROLE_KEY='your-key'"
echo "  bash apply-migrations.sh"
echo ""

echo "Option C: Using Supabase CLI"
echo "─────────────────────────────────────"
echo "  supabase db push"
echo ""

# Check for service role key
if [[ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "🔑 Service Role Key detected!"
    echo ""
    
    ADMIN_RESPONSE=$(curl -s -X POST \
      "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"sql\": $(echo "$MIGRATION_SQL" | jq -Rs '.')}")
    
    echo "Execution response:"
    echo "$ADMIN_RESPONSE"
    
    if echo "$ADMIN_RESPONSE" | grep -q "admin_principal"; then
        echo ""
        echo "✅ SUCCESS! Migration applied!"
    fi
fi
