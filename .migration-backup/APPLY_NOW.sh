#!/usr/bin/env bash

# 🚀 APPLIQUER LA MIGRATION EN 5 ÉTAPES (2 MINUTES)

clear

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        NOTIFICATIONS PERSISTANTES - APPLICATION          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "5️⃣ ÉTAPES POUR ACTIVER:"
echo ""

echo "1️⃣  Ouvrez: https://supabase.com/dashboard"
echo ""

echo "2️⃣  Sélectionnez BAS GAUCHE:"
echo "   SQL Editor → New Query"
echo ""

echo "3️⃣  Collez ce SQL dans l'éditeur:"
echo ""

# Afficher le SQL sans comments
grep -v "^--" /workspaces/voie-verite-vie/APPLY_NOTIFICATION_MIGRATION.sql | grep -v "^$"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "4️⃣  Cliquez: RUN (ou Ctrl+Enter)"
echo ""

echo "5️⃣  VOILÀ! La migration est appliquée! ✅"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ TESTER:"
echo "   Allez à: http://localhost:5173/admin/notifications"
echo "   Envoyez une notification"
echo "   Vérifiez la cloche 🔔"
echo ""
