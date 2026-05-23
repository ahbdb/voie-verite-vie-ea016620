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

    // Step 1: Check if profile exists
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'ahdybau@gmail.com')
      .single();

    let userId;

    if (!profile) {
      console.log('📝 Profile not found, creating...');
      
      // Try to get the user from auth.users via RLS
      // Since we can't directly query auth.users with anon key, we'll create a profile
      // and hope the user exists in auth.users
      
      // For now, let's try a different approach - use a stored procedure or direct insert
      console.log('⚠️  Profile does not exist yet.');
      console.log('📋 Please follow these steps:');
      console.log('');
      console.log('1. Go to Supabase Dashboard: https://app.supabase.com');
      console.log('2. Select your project (kaddsojhnkyfavaulrfc)');
      console.log('3. Go to Authentication > Users');
      console.log('4. Click "Invite" and create user:');
      console.log('   - Email: ahdybau@gmail.com');
      console.log('   - Password: (set a strong password)');
      console.log('5. Check the confirmation email and set up your account');
      console.log('6. Run this script again');
      console.log('');
      process.exit(1);
    }

    userId = profile.id;
    console.log(`✅ Found user: ${profile.email} (ID: ${userId})`);

    // Step 2: Delete old admin roles
    console.log('🗑️  Cleaning up old roles...');
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('role', ['admin', 'moderator', 'admin_principal']);

    if (deleteError) {
      console.log('⚠️  (No old roles found or error deleting)');
    } else {
      console.log('✅ Old admin roles removed');
    }

    // Step 3: Insert new admin_principal role
    console.log('📝 Adding admin_principal role...');
    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await supabase
      .from('user_roles')
      .insert([
        {
          user_id: userId,
          role: 'admin_principal',
          created_at: now,
          updated_at: now
        }
      ])
      .select();

    if (insertError) {
      console.error('❌ Error inserting admin_principal role:', insertError);
      process.exit(1);
    }

    console.log('✅ Successfully set admin_principal role!\n');
    console.log('🎉 Admin Setup Complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Go to: https://voie-verite-vie.vercel.app');
    console.log('   2. Complete sign out (Ctrl+Shift+Delete to clear cache)');
    console.log('   3. Sign in with: ahdybau@gmail.com');
    console.log('   4. You should now see all admin features! ✨\n');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

setupAdminPrincipal();
