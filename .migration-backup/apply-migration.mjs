import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://kaddsojhnkyfavaulrfc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"
);

async function apply() {
  console.log('🔧 Applying admin_principal migration...\n');

  const sql = `
    DO $$
    DECLARE
      admin_user_id uuid;
      user_email text := 'ahdybau@gmail.com';
    BEGIN
      SELECT id INTO admin_user_id FROM auth.users 
      WHERE email = user_email LIMIT 1;

      IF admin_user_id IS NOT NULL THEN
        DELETE FROM public.user_roles 
        WHERE user_id = admin_user_id;
        
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin_principal'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END $$;
  `;

  try {
    // Execute via RPC if available, or try direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error && error.code !== 'PGRST202') {
      console.error('❌ Migration error:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');

    // Verify
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', '54f77d49-1ab0-4e72-8a54-bcfd44d7bb87');

    console.log('📋 Current roles:', roles);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

apply();
