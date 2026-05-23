#!/bin/bash

# ════════════════════════════════════════════════════════════════
# ADMIN ROLE RESTORATION SCRIPT
# Voie, Vérité, Vie - Bible Study Platform
# ════════════════════════════════════════════════════════════════
#
# This script provides THREE METHODS to restore admin_principal role
# for ahdybau@gmail.com
#
# User-level API cannot bypass Row Level Security, so automatic
# restoration is not possible. But manual restoration is very simple!
# ════════════════════════════════════════════════════════════════

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║   Admin Role Restoration - Choose Your Method      ║"
echo "║   User: ahdybau@gmail.com                           ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if SQL file exists
if [ -f "restore-admin-role.sql" ]; then
  SQL_FOUND="✓"
else
  SQL_FOUND="✗"
fi

echo "═══════════════════════════════════════════════════════════════"
echo "🎯 RECOMMENDED: METHOD 1 - Web Dashboard"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "This is the easiest method - no installation needed!"
echo ""
echo "STEP 1: Open the repair page"
echo "   → Go to: http://localhost:8080/admin-repair"
echo ""
echo "STEP 2: Click 'Repair via Dashboard' tab"
echo "   → This shows complete visual instructions"
echo ""
echo "STEP 3: Follow the on-screen steps"
echo "   → You'll get copy-to-clipboard buttons"
echo ""
echo "STEP 4: Refresh browser (F5)"
echo "   → Your admin role should be active!"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 METHOD 2 - Supabase Dashboard Direct"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "For advanced users who prefer the dashboard:"
echo ""
echo "STEP 1: Go to https://app.supabase.com"
echo "STEP 2: Select your project from sidebar"
echo "STEP 3: Click SQL Editor"
echo "STEP 4: Click 'New query'"
echo "STEP 5: Copy this SQL script:"
echo ""
echo "────────────────────────────────────────────────────"
cat << 'EOL'

-- Restore admin_principal role for ahdybau@gmail.com
BEGIN;

-- Delete old roles if any exist
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com');

-- Insert admin_principal role
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin_principal', NOW(), NOW() 
FROM auth.users 
WHERE email = 'ahdybau@gmail.com';

COMMIT;

-- Verify (you should see: ahdybau@gmail.com | admin_principal)
SELECT u.email, ur.role 
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';

EOL
echo "────────────────────────────────────────────────────"
echo ""
echo "STEP 6: Paste into SQL Editor and click RUN"
echo "STEP 7: Wait for Success message"
echo "STEP 8: Refresh your browser (F5)"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "⚙️  METHOD 3 - Node.js CLI (Advanced)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "If you have the SERVICE_ROLE_KEY environment variable set:"
echo ""
echo "  SERVICE_ROLE_KEY='sk_...' node fix-admin-role.mjs"
echo ""
echo "This will automatically restore the role."
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔍 VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "After running the SQL in Method 1 or 2, you should see:"
echo ""
echo "  Query result:"
echo "  ─────────────────────────────────────────"
echo "  email              | role"
echo "  ─────────────────────────────────────────"
echo "  ahdybau@gmail.com  | admin_principal"
echo ""
echo "If you see this, restoration was successful! ✓"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "❓ TROUBLESHOOTING"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "After restoration, if you still can't access admin panel:"
echo ""
echo "1️⃣  CLEAR BROWSER CACHE:"
echo "   • Press Ctrl+Shift+Del (Windows/Linux) or Cmd+Shift+Del (Mac)"
echo "   • Select 'Cookies and Cached Images' → Clear"
echo "   • OR open DevTools (F12) → Application → Clear Storage"
echo ""
echo "2️⃣  HARD REFRESH:"
echo "   • Press F5 or Ctrl+R (Windows/Linux)"
echo "   • OR press Cmd+R (Mac)"
echo "   • OR Ctrl+Shift+R for hard refresh"
echo ""
echo "3️⃣  CHECK STATUS:"
echo "   • Go to http://localhost:8080/admin-repair"
echo "   • Click 'Check Role Status' button"
echo "   • You should see: ✅ You are admin_principal!"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✨ All files ready:"
echo "═══════════════════════════════════════════════════════════════"
[ "$SQL_FOUND" = "✓" ] && echo "  $SQL_FOUND SQL Script:        restore-admin-role.sql" || echo "  ✗ SQL Script:        NOT FOUND"
echo "  ✓ Node Script:      fix-admin-role.mjs"
echo "  ✓ Web Interface:    http://localhost:8080/admin-repair"
echo ""
