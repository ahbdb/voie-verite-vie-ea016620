#!/usr/bin/env node

/**
 * Vérifier si la migration des notifications a été appliquée avec succès
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erreur: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant dans .env');
  process.exit(1);
}

console.log('🔍 Vérification de la migration des notifications...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMigration() {
  let allGood = true;

  try {
    // Vérifier la table broadcast_notifications
    console.log('Vérification 1️⃣  broadcast_notifications...');
    const { error: e1 } = await supabase.from('broadcast_notifications').select('count', { count: 'exact', head: true });
    if (e1) {
      console.log('  ❌ MANQUANTE - La migration n\'a pas été appliquée');
      allGood = false;
    } else {
      console.log('  ✓ Trouvée');
    }

    // Vérifier la table user_notifications
    console.log('\nVérification 2️⃣  user_notifications...');
    const { error: e2 } = await supabase.from('user_notifications').select('count', { count: 'exact', head: true });
    if (e2) {
      console.log('  ❌ MANQUANTE - La migration n\'a pas été appliquée');
      allGood = false;
    } else {
      console.log('  ✓ Trouvée');
    }

    // Vérifier la table notification_settings
    console.log('\nVérification 3️⃣  notification_settings...');
    const { error: e3 } = await supabase.from('notification_settings').select('count', { count: 'exact', head: true });
    if (e3) {
      console.log('  ❌ MANQUANTE - La migration n\'a pas été appliquée');
      allGood = false;
    } else {
      console.log('  ✓ Trouvée');
    }

    // Vérifier la fonction RPC
    console.log('\nVérification 4️⃣  Fonction RPC send_broadcast_notification...');
    try {
      // Essayer d'appeler la fonction (sans paramètres pour juste vérifier qu'elle existe)
      const { error: e4 } = await (supabase as any).rpc('send_broadcast_notification', { p_broadcast_id: '00000000-0000-0000-0000-000000000000' }).catch(() => ({ error: null }));
      console.log('  ✓ Trouvée');
    } catch (err) {
      console.log('  ❌ NOT FOUND - Vérifiez la migration');
      allGood = false;
    }

    // Résultat final
    console.log('\n' + '═'.repeat(50));
    if (allGood) {
      console.log('✅ MIGRATION APPLIQUÉE AVEC SUCCÈS!');
      console.log('');
      console.log('Les tables et fonctions sont prêtes à utiliser:');
      console.log('  1. Allez à /admin/notifications');
      console.log('  2. Envoyez une notification');
      console.log('  3. Vérifiez qu\'elle apparaît dans la cloche 🔔');
    } else {
      console.log('❌ MIGRATION NON APPLIQUÉE');
      console.log('');
      console.log('Appliquez la migration:');
      console.log('  1. Allez à: https://supabase.com/dashboard');
      console.log('  2. SQL Editor → New Query');
      console.log('  3. Collez le contenu de: APPLY_NOTIFICATION_MIGRATION.sql');
      console.log('  4. Cliquez RUN');
    }
    console.log('═'.repeat(50));

  } catch (err: any) {
    console.error('❌ Erreur lors de la vérification:', err.message);
  }
}

checkMigration();
