import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Env vars missing: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminRole() {
  try {
    console.log('🔍 Checking admin status for ahdybau@gmail.com...\n');

    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      return;
    }

    const user = users.users.find(u => u.email === 'ahdybau@gmail.com');
    
    if (!user) {
      console.error('❌ User ahdybau@gmail.com not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Last Sign In: ${user.last_sign_in_at}\n`);

    // Check user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }

    console.log('📋 Current roles in database:');
    if (!roles || roles.length === 0) {
      console.log('   ⚠️  No roles found!');
    } else {
      roles.forEach(r => console.log(`   • ${r.role}`));
    }

    // Check if has admin_principal
    const hasAdminPrincipal = roles?.some(r => r.role === 'admin_principal');
    const hasAdmin = roles?.some(r => r.role === 'admin');
    
    console.log('\n✨ Role Summary:');
    console.log(`   admin_principal: ${hasAdminPrincipal ? '✅ YES' : '❌ NO'}`);
    console.log(`   admin: ${hasAdmin ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAdminRole();
