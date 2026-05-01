import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kaddsojhnkyfavaulrfc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function applyMigrations() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        🚀 APPLYING ALL SUPABASE MIGRATIONS                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const migrationsDir = '/workspaces/voie-verite-vie/supabase/migrations';
  
  // Read all migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📋 Found ${files.length} migrations to check\n`);

  // Get the most recent migration that needs to be applied
  // We'll focus on the admin_principal setup ones
  const adminMigrations = files.filter(f => 
    f.includes('admin_principal') || 
    f.includes('admin_roles_hierarchy') ||
    f.includes('superadmin')
  );

  console.log(`👑 Admin-related migrations: ${adminMigrations.length}\n`);

  // The key migration we need
  const completeMigration = path.join(migrationsDir, '20260216_complete_admin_principal_setup.sql');
  
  if (fs.existsSync(completeMigration)) {
    console.log('✅ Found complete admin principal setup migration\n');
    
    const migrationSQL = fs.readFileSync(completeMigration, 'utf8');
    
    console.log('📝 Migration content (preview):');
    console.log('─'.repeat(60));
    console.log(migrationSQL.split('\n').slice(0, 20).join('\n'));
    console.log('─'.repeat(60));
    console.log('\n');

    // Try to execute via different methods
    console.log('🔧 Attempting to execute migration...\n');

    // Method 1: Try to use fetch to call Postgres
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_execute`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (response.ok) {
        console.log('✅ Migration executed successfully via RPC!\n');
        const data = await response.json();
        console.log('Result:', data);
        return;
      }
    } catch (e) {
      console.log('⚠️  RPC method failed (expected)');
    }

    // Method 2: Create a temporary function to execute
    console.log('\n📌 MIGRATION CONTENT:\n');
    console.log('═'.repeat(60));
    console.log('Copy the SQL below and execute in Supabase Dashboard:\n');
    console.log('URL: ' + `${SUPABASE_URL.split('/')[2]}/project/kaddsojhnkyfavaulrfc/sql/editor\n`);
    console.log(migrationSQL);
    console.log('═'.repeat(60));
    console.log('\n');

    // Check if user has service key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      console.log('🔑 Service role key detected! Attempting direct execution...\n');
      
      const supabaseAdmin = createClient(SUPABASE_URL, serviceKey);
      
      // Try executing via Postgres function
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql: migrationSQL
      });

      if (error) {
        console.log('⚠️  Error:', error.message);
        console.log('Note: exec_sql function may not exist');
      } else {
        console.log('✅ SUCCESS! Migration applied via service role');
        console.log('Result:', data);
      }
    } else {
      console.log('💡 To execute automatically, set SUPABASE_SERVICE_ROLE_KEY');
      console.log('   Then migrations will be applied without manual intervention\n');
    }
  }

  // Show next steps
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    NEXT STEPS                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('✅ Option 1: Manual Execution via Dashboard');
  console.log('   1. Open Supabase Dashboard');
  console.log('   2. SQL Editor > New Query');
  console.log('   3. Copy-paste the migration SQL shown above');
  console.log('   4. Click Execute\n');

  console.log('✅ Option 2: Use Service Role Key');
  console.log('   export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.log('   node apply-migrations.mjs\n');

  console.log('✅ Option 3: Use Supabase CLI');
  console.log('   supabase db push\n');
}

applyMigrations().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
