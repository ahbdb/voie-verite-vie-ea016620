import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAdminPrincipal() {
  try {
    console.log('🔧 Setting up admin_principal role for ahdybau@gmail.com...\n');

    // Step 1: Check if user exists
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'ahdybau@gmail.com')
      .single();

    if (userError || !users) {
      console.error('❌ User ahdybau@gmail.com not found in profiles!');
      console.error('   Please create the user first via Supabase Dashboard');
      process.exit(1);
    }

    const userId = users.id;
    console.log(`✅ Found user: ${users.email} (ID: ${userId})`);

    // Step 2: Delete old admin roles
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('role', ['admin', 'moderator', 'admin_principal']);

    if (deleteError) {
      console.error('⚠️ Error deleting old roles:', deleteError);
    } else {
      console.log('✅ Deleted old admin roles');
    }

    // Step 3: Insert new admin_principal role
    const { data: inserted, error: insertError } = await supabase
      .from('user_roles')
      .insert([
        {
          user_id: userId,
          role: 'admin_principal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) {
      console.error('❌ Error inserting admin_principal role:', insertError);
      process.exit(1);
    }

    console.log('✅ Successfully set admin_principal role!\n');
    console.log('📋 What to do next:');
    console.log('   1. Complete sign out from the app');
    console.log('   2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('   3. Sign back in');
    console.log('   4. You should now see all admin features! 🎉\n');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

setupAdminPrincipal();
