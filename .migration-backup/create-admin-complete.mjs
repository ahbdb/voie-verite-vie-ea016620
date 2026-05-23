import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kaddsojhnkyfavaulrfc.supabase.co';
const SERVICE_ROLE_KEY = 're_YcztZdEG_7MsuMCLjcw4rf49PeCCmTxBw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setup() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   👑 COMPLETE ADMIN PRINCIPAL SETUP                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const email = 'ahdybau@gmail.com';

    // Step 1: Check if user exists in auth
    console.log('Step 1: Checking auth users...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }

    const authUser = authData.users.find(u => u.email === email);
    
    if (!authUser) {
      console.error(`❌ User ${email} not found in auth.users!`);
      console.log('   Creating user...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: Math.random().toString(36).slice(-16),
        email_confirm: true,
      });

      if (createError) {
        console.error('❌ Failed to create user:', createError.message);
        return;
      }

      console.log(`✅ User created: ${newUser.user.id}`);
    } else {
      console.log(`✅ User found in auth: ${authUser.id}`);
    }

    const userId = authUser?.id || (await supabase.auth.admin.createUser({ email, password: Math.random().toString(36).slice(-16), email_confirm: true })).data.user.id;

    // Step 2: Create profile
    console.log('\nStep 2: Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('❌ Profile error:', profileError.message);
    } else {
      console.log('✅ Profile created/updated');
    }

    // Step 3: Delete old roles
    console.log('\nStep 3: Cleaning old roles...');
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    console.log('✅ Old roles removed');

    // Step 4: Insert admin_principal
    console.log('\nStep 4: Creating admin_principal role...');
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin_principal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (roleError) {
      console.error('❌ Role error:', roleError.message);
      if (roleError.message.includes('invalid input value for enum')) {
        console.log('\n⚠️  admin_principal not in enum yet. Trying to add it...');
        
        // Try to add the enum value via RPC or direct SQL
        const { error: enumError } = await supabase.rpc('add_admin_principal_enum');
        if (enumError) {
          console.log('⚠️  Could not add enum via RPC');
          console.log('You can manually add it in Supabase: ALTER TYPE public.app_role ADD VALUE \'admin_principal\';');
        }
      }
      return;
    }

    console.log('✅ Role created:', roleData);

    // Step 5: Verify
    console.log('\nStep 5: Verifying...');
    const { data: verify } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    console.log('✅ Current roles:', verify);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            ✨ ADMIN PRINCIPAL SETUP COMPLETE! ✨           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Configured:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${email}`);
    console.log('   Role: admin_principal ✅\n');

    console.log('🚀 Next:');
    console.log('   1. Sign out completely');
    console.log('   2. Clear cache (Ctrl+Shift+Delete)');
    console.log('   3. Sign back in');
    console.log('   4. Admin section → 12 tabs visible! 👑\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setup();
