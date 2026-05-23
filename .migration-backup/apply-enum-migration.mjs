import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://kaddsojhnkyfavaulrfc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"
);

async function applyEnumMigration() {
  console.log('🔧 Applying enum migration (adding admin_principal to app_role)...\n');

  // Note: We need to use raw SQL via the Postgres API
  // Since we don't have direct SQL execution, we'll need to use fetch API
  
  const SUPABASE_URL = "https://kaddsojhnkyfavaulrfc.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs";

  // The SQL to apply (using DO block to check if values exist first)
  const sql = `
    DO $$
    BEGIN
      -- Try to add admin_principal
      BEGIN
        ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
      EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'admin_principal already exists';
      END;
      
      -- Try to add moderator
      BEGIN
        ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';
      EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'moderator already exists';
      END;
    END $$;
  `;

  try {
    // Try via pg_net if available
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql })
    });

    const result = await response.json();
    console.log('Response:', result);

    if (!response.ok) {
      console.log('\n❌ Could not execute via RPC (expected)');
      console.log('📋 The migration must be applied manually in Supabase Dashboard');
      console.log('   Or we need the service_role_key to execute SQL directly');
      process.exit(1);
    }

    console.log('✅ Enum migration applied!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyEnumMigration();
