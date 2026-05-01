import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kaddsojhnkyfavaulrfc.supabase.co';
const SERVICE_ROLE_KEY = 're_YcztZdEG_7MsuMCLjcw4rf49PeCCmTxBw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function executeAdminSetup() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 EXECUTING ADMIN PRINCIPAL SETUP WITH SERVICE KEY      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Test connection
    console.log('🔗 Testing connection with service role key...');
    const { data: testUser, error: testError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);

    if (testError && testError.code !== 'PGRST116') {
      console.log('⚠️ Connection test:', testError.message);
    } else {
      console.log('✅ Connection successful!\n');
    }

    // Step 2: Get the user
    console.log('👤 Finding user: ahdybau@gmail.com');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'ahdybau@gmail.com');

    if (profileError) {
      console.error('❌ Error finding profile:', profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.error('❌ User profile not found!');
      console.log('   The user must be created in auth first');
      return;
    }

    const userId = profiles[0].id;
    console.log(`✅ Found user: ${profiles[0].email} (ID: ${userId})\n`);

    // Step 3: Clean old roles
    console.log('🗑️  Removing old roles...');
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (!deleteError) {
      console.log('✅ Old roles removed\n');
    }

    // Step 4: Insert admin_principal role
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
      console.error('❌ Error inserting role:', insertError.message);
      if (insertError.message.includes('invalid input value for enum')) {
        console.log('\n⚠️  The admin_principal enum value does not exist yet.');
        console.log('   This migration needs to be run first:');
        console.log('   → supabase/migrations/20260215_add_admin_roles_hierarchy.sql\n');
      }
      return;
    }

    console.log('✅ Role inserted!\n');

    // Step 5: Verify
    console.log('✅ Verifying setup...');
    const { data: verify } = await supabase
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .eq('user_id', userId);

    if (verify && verify.length > 0) {
      console.log('✅ Roles verified:', verify);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✨ ADMIN PRINCIPAL SETUP COMPLETE!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Configuration Applied:');
    console.log('   Email: ahdybau@gmail.com');
    console.log('   Role: admin_principal');
    console.log('   Status: ✅ ACTIVE\n');

    console.log('🎯 Next Steps:');
    console.log('   1. Sign out completely from the app');
    console.log('   2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('   3. Sign back in with ahdybau@gmail.com');
    console.log('   4. Click "Admin" in the menu');
    console.log('   5. All 12 admin tabs should be visible! 👑\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

executeAdminSetup();
