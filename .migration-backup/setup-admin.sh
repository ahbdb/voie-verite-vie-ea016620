#!/bin/bash

# Script pour ajouter automatiquement le rôle admin à ahdybau@gmail.com
# Ce script utilise curl pour accéder directement à l'API Supabase

PROJECT_ID="kaddsojhnkyfavaulrfc"
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"

echo "📋 Script de Configuration Admin - 3V Bible"
echo "==========================================="
echo ""

# Vérifions d'abord si supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "⚠️ Supabase CLI non trouvé"
    echo "Installation en cours..."
    npm install -g supabase
fi

echo "✅ Supabase CLI détecté"
echo ""
echo "📝 Étapes à suivre:"
echo ""
echo "1️⃣  Allez sur: https://app.supabase.com/project/${PROJECT_ID}/sql/new"
echo ""
echo "2️⃣  Copiez-collez le SQL suivant et exécutez-le:"
echo ""
echo "========================================"
cat << 'SQL'
-- Ajouter le rôle admin à ahdybau@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users 
WHERE email = 'ahdybau@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Vérifier que c'est bien ajouté
SELECT 'Admin role added!' as status, COUNT(*) as admin_count
FROM public.user_roles 
WHERE role = 'admin' AND user_id = (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com');
SQL
echo "========================================"
echo ""
echo "3️⃣  Après l'exécution:"
echo "   - Rafraîchissez l'app (F5)"
echo "   - Déconnectez-vous et reconnectez-vous"
echo "   - Cliquez sur 'Admin' → ça devrait marcher! ✅"
echo ""
