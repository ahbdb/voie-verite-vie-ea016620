import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://kaddsojhnkyfavaulrfc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"
);

async function upgrade() {
  try {
    console.log('👑 Upgrading ahdybau@gmail.com to admin_principal...\n');

    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'ahdybau@gmail.com')
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      process.exit(1);
    }

    const userId = user.id;
    console.log(`✅ Found user ID: ${userId}`);

    // Step 1: Delete old roles
    console.log('🗑️  Removing old roles...');
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (!deleteError) {
      console.log('✅ Old roles removed');
    }

    // Step 2: Insert admin_principal
    console.log('👑 Adding admin_principal role...');
    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin_principal',
        created_at: now,
        updated_at: now
      });

    if (insertError) {
      console.error('❌ Error:', insertError);
      process.exit(1);
    }

    // Verify
    const { data: verify } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    console.log('\n✅ Current roles:', verify);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            ✨ UPGRADED TO ADMIN_PRINCIPAL!                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n🎯 Next step: Sign out and back in to see all admin features!');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

upgrade();
