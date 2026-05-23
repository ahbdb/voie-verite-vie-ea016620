import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and Service Role Key from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dgcfvxhspyukdbnrwbyd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('⛔ SERVICE_ROLE_KEY not set. Set it as environment variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixAdminRole() {
  try {
    console.log('🔧 Checking admin role for ahdybau@gmail.com...\n');

    // 1. Get the user from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    const adminUser = users.find(u => u.email === 'ahdybau@gmail.com');
    
    if (!adminUser) {
      console.error('❌ User ahdybau@gmail.com not found in auth');
      return;
    }

    console.log('✅ Found user:', adminUser.email);
    console.log('   ID:', adminUser.id);
    console.log('   Created:', adminUser.created_at);

    // 2. Check current roles
    const { data: currentRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id);

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }

    console.log('\n📋 Current roles in database:');
    if (!currentRoles || currentRoles.length === 0) {
      console.log('   ⚠️  No roles found!');
    } else {
      currentRoles.forEach(role => {
        console.log(`   - ${role.role} (created: ${role.created_at})`);
      });
    }

    // 3. Delete all existing roles
    if (currentRoles && currentRoles.length > 0) {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', adminUser.id);

      if (deleteError) {
        console.error('❌ Error deleting roles:', deleteError);
        return;
      }
      console.log('\n🗑️  Deleted old roles');
    }

    // 4. Insert admin_principal role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: adminUser.id,
        role: 'admin_principal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ Error inserting role:', insertError);
      return;
    }

    console.log('✅ Inserted admin_principal role');

    // 5. Verify
    const { data: newRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id);

    console.log('\n✨ Final state:');
    newRoles?.forEach(role => {
      console.log(`   - ${role.role} ✅`);
    });

    console.log('\n🎉 Admin role restored successfully!');
    console.log('   Please refresh your browser (F5)');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAdminRole();
