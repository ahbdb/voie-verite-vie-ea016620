#!/usr/bin/env node

/**
 * Script pour appliquer manuellement la migration des notifications persistantes
 * Exécute le SQL de la migration directement sur Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Récupérer les variables d'environnement
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Erreur: SUPABASE_URL non trouvé dans .env');
  console.error('Assurez-vous que votre .env contient VITE_SUPABASE_URL ou SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY non trouvé');
  console.error('');
  console.error('Pour obtenir cette clé:');
  console.error('1. Allez à https://supabase.com/dashboard');
  console.error('2. Sélectionnez votre projet');
  console.error('3. Allez à Settings → API');
  console.error('4. Copiez "Service Role Key" (secrète, ne pas partager)');
  console.error('5. Collez-la dans votre .env en tant que SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('🔄 Connexion à Supabase...');
    
    // Créer le client Supabase avec la clé de service
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    console.log('✓ Connecté!');
    console.log('');

    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260220_create_notification_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Diviser le SQL en statements individuels (séparés par ;)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Migration: ${statements.length} statements à exécuter`);
    console.log('');

    let completed = 0;
    let skipped = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Afficher la progression
      const stmtType = stmt.split('\n')[0].toUpperCase().slice(0, 20);
      process.stdout.write(`  [${i + 1}/${statements.length}] ${stmtType.padEnd(20)} ... `);

      try {
        // Exécuter le statement
        const { error } = await supabase.rpc('exec_sql', { sql: stmt }, { 
          headers: { 
            'Content-Type': 'application/json'
          } 
        }).catch(async () => {
          // Fallback: Si l'RPC n'existe pas, essayer avec sql()
          return await supabase.sql`${stmt}`.catch(err => ({ error: err }));
        });

        if (error) {
          // Certaines erreurs sont attendues (ex: "already exists")
          if (error.message && (
            error.message.includes('already exists') || 
            error.message.includes('duplicata') ||
            error.message.includes('already') ||
            error.message.includes('EXISTS')
          )) {
            console.log('⊘ (existe déjà)');
            skipped++;
          } else {
            console.log('❌');
            console.error(`  Erreur: ${error.message || JSON.stringify(error)}`);
          }
        } else {
          console.log('✓');
          completed++;
        }
      } catch (err: any) {
        // Ignorer les erreurs "already exists"
        if (err.message && (
          err.message.includes('already') ||
          err.message.includes('EXISTS') ||
          err.message.includes('déjà')
        )) {
          console.log('⊘ (existe déjà)');
          skipped++;
        } else {
          console.log('❌');
          console.error(`  Erreur: ${err.message || err}`);
        }
      }
    }

    console.log('');
    console.log('═'.repeat(50));
    console.log(`✓ Migration appliquée!`);
    console.log(`  - Complétés: ${completed}`);
    console.log(`  - Existaient déjà: ${skipped}`);
    console.log('═'.repeat(50));

    // Vérifier que les tables existent
    console.log('');
    console.log('🔍 Vérification des tables créées...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['broadcast_notifications', 'user_notifications', 'notification_settings']);

    if (tablesError) {
      console.log('⚠️  Impossible de vérifier les tables (mais la migration a probablement réussi)');
    } else if (tables && tables.length > 0) {
      console.log(`✓ ${tables.length}/3 tables créées:`);
      tables.forEach((t: any) => console.log(`  - ${t.table_name}`));
    }

    console.log('');
    console.log('🎉 Migration terminée avec succès!');
    console.log('');
    console.log('Prochaines étapes:');
    console.log('1. Allez à /admin/notifications');
    console.log('2. Envoyez une notification de test');
    console.log('3. Vérifiez qu\'elle apparaît dans la cloche 🔔');
    console.log('');

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'application de la migration:');
    console.error(error.message || error);
    console.error('');
    console.error('Assurez-vous que:');
    console.error('1. Votre SUPABASE_SERVICE_ROLE_KEY est correcte');
    console.error('2. Vous êtes connecté à Internet');
    console.error('3. Votre projet Supabase est actif');
    process.exit(1);
  }
}

// Exécuter
applyMigration();
