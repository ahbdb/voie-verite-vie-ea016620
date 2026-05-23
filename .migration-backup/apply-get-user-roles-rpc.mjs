import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  console.error('\n⚠️  If you don\'t have SUPABASE_SERVICE_ROLE_KEY, you can still apply the migration manually:');
  console.error('   1. Go to Supabase Dashboard');
  console.error('   2. SQL Editor');
  console.error('   3. Copy-paste the migration SQL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔧 Applying RPC migration for get_current_user_roles()...\n');
    
    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260216_get_user_roles_rpc.sql'
    );
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    console.log('📄 Migration SQL loaded (' + sqlContent.length + ' bytes)\n');
    
    // Execute the migration
    const { error } = await supabase.rpc('safe_execute_sql', {
      sql: sqlContent
    });
    
    if (error && error.code === '42883') {
      console.warn('⚠️  safe_execute_sql RPC not available, trying direct approach...\n');
      
      // Try split by semicolon and execute each statement (safer approach)
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
      
      // Execute each statement via the first function
      const createFunctionSQL = statements.find(s => s.includes('CREATE OR REPLACE FUNCTION public.get_current_user_roles'));
      const createFunction2SQL = statements.find(s => s.includes('CREATE OR REPLACE FUNCTION public.get_user_admin_role'));
      const grantSQL = statements.find(s => s.includes('GRANT EXECUTE'));
      
      if (createFunctionSQL) {
        console.log('🔨 Creating get_current_user_roles() function...');
        const { error: err1 } = await supabase.rpc('execute_sql', {
          sql: createFunctionSQL + ';'
        }).catch(() => ({ error: { message: 'Not available' } }));
        
        if (err1) {
          console.warn('⚠️  Could not execute via RPC. Please apply the migration manually:');
          console.log('\n📋 Migration SQL (copy to Supabase SQL Editor):\n');
          console.log(sqlContent);
          process.exit(0);
        }
      }
      
      process.exit(0);
    }
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('\n📋 Migration SQL (apply manually in Supabase SQL Editor):\n');
      console.log(sqlContent);
      process.exit(1);
    }
    
    console.log('✅ RPC migration applied successfully!\n');
    console.log('📝 Created functions:');
    console.log('   • get_current_user_roles() - Get roles of current user');
    console.log('   • get_user_admin_role() - Get highest admin role\n');
    console.log('🎉 The admin link should now appear in navigation for ahdybau@gmail.com');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.error('\n📋 Please apply this migration manually:\n');
    
    try {
      const migrationPath = path.join(
        process.cwd(),
        'supabase/migrations/20260216_get_user_roles_rpc.sql'
      );
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      console.log(sqlContent);
    } catch (e) {
      console.error('Could not read migration file');
    }
    
    process.exit(1);
  }
}

applyMigration();
