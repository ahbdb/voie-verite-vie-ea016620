#!/usr/bin/env bash

# Guide Interactif pour Appliquer la Migration des Notifications

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Migration: Système de Notifications Persistantes     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Option 1: Via Supabase Dashboard
echo "Option 1️⃣ : Via Supabase Dashboard (Recommandé - 2 minutes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Étapes:"
echo "1. Allez à: https://supabase.com/dashboard"
echo "2. Sélectionnez votre projet"
echo "3. Allez à: SQL Editor (menu de gauche)"
echo "4. Cliquez sur: New Query"
echo "5. Collez le contenu du fichier:"
echo "   → supabase/migrations/20260220_create_notification_system.sql"
echo ""
echo "6. Cliquez sur: RUN (en haut à droite)"
echo ""
echo "✓ La migration sera appliquée instantanément!"
echo ""

# Option 2: Via CLI
echo ""
echo "Option 2️⃣ : Via Supabase CLI (Si installé)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Commande:"
echo "  supabase link"
echo "  supabase db push"
echo ""

# Option 3: Via le script Node
echo ""
echo "Option 3️⃣ : Via Script Node (Automatique)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "D'abord, obtenez votre SERVICE_ROLE_KEY:"
echo "1. Allez à: https://supabase.com/dashboard"
echo "2. Sélectionnez votre projet"
echo "3. Allez à: Settings → API"
echo "4. Copiez: 'Service Role Key' (NE PAS PARTAGER!)"
echo "5. Collez dans .env: SUPABASE_SERVICE_ROLE_KEY=votre_clé"
echo ""
echo "Puis exécutez:"
echo "  node apply-notification-migration.mjs"
echo ""

# Vérifier .env
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "État Actuel de Votre Configuration"
echo "═══════════════════════════════════════════════════════════"
echo ""

if grep -q "VITE_SUPABASE_URL" .env 2>/dev/null; then
  echo "✓ SUPABASE_URL trouvé dans .env"
else
  echo "❌ SUPABASE_URL manquant"
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env 2>/dev/null; then
  echo "✓ SERVICE_ROLE_KEY trouvé dans .env"
else
  echo "❌ SERVICE_ROLE_KEY manquant (nécessaire pour Option 3)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🚀 Quelle est votre préférence?"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Réponses recommandées:"
echo ""
echo "→ Si vous êtes sur une machine locale:"
echo "  Utilisez Option 1 (Supabase Dashboard)"
echo ""
echo "→ Si vous avez Supabase CLI installé:"
echo "  Utilisez Option 2"
echo ""
echo "→ Si vous voulez l'automatiser:"
echo "  Utilisez Option 3 (mais d'abord collez SERVICE_ROLE_KEY dans .env)"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
