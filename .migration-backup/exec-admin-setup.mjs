import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kaddsojhnkyfavaulrfc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin_principal for ahdybau@gmail.com...\n');

    // Step 1: Get user from auth (via the public.profiles table)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'ahdybau@gmail.com');

    if (profileError) {
      console.error('❌ Profile query error:', profileError);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.log('ℹ️  User profile does not exist yet.');
      console.log('   The user should have signed up via the app first.');
      console.log('');
      console.log('📱 Please:');
      console.log('   1. Go to the app');
      console.log('   2. Sign up with ahdybau@gmail.com');
      console.log('   3. Then run this script again');
      process.exit(1);
    }

    const userId = profiles[0].id;
    console.log(`✅ Found user: ${profiles[0].email}`);
    console.log(`   ID: ${userId}\n`);

    // Step 2: Remove old admin roles
    console.log('🗑️  Removing old roles...');
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('role', ['admin', 'moderator']);

    if (!deleteError) {
      console.log('✅ Old roles removed\n');
    }

    // Step 3: Create admin_principal role
    console.log('👑 Creating admin_principal role...');
    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin_principal',
        created_at: now,
        updated_at: now
      })
      .select();

    if (insertError) {
      console.error('❌ Error creating role:', insertError.message);
      process.exit(1);
    }

    console.log('✅ Admin role created!\n');

    // Step 4: Verify
    console.log('✅ Verifying...');
    const { data: verify, error: verifyError } = await supabase
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .eq('user_id', userId)
      .eq('role', 'admin_principal');

    if (verify && verify.length > 0) {
      console.log('✅ Role verified:', verify[0].role);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✨ ADMIN SETUP COMPLETE!                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🎯 What to do next:');
    console.log('   1. Go to your app: https://voie-verite-vie.vercel.app');
    console.log('   2. Sign out completely');
    console.log('   3. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('   4. Sign back in with ahdybau@gmail.com');
    console.log('   5. Click "Admin" in the menu');
    console.log('   6. You now have full admin_principal access! 🎉');
    console.log('');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

setupAdmin();
