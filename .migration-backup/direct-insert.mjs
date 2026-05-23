import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://kaddsojhnkyfavaulrfc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"
);

async function insert() {
  console.log('🔧 Direct insert of admin_principal role...\n');

  const userId = '54f77d49-1ab0-4e72-8a54-bcfd44d7bb87';

  try {
    // Delete old roles first
    console.log('🗑️ Deleting old roles...');
    const { error: deleteErr } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteErr) {
      console.log('⚠️ Delete error (may be RLS):', deleteErr.message);
    } else {
      console.log('✅ Old roles deleted');
    }

    // Insert admin_principal
    console.log('👑 Inserting admin_principal...');
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin_principal'
      })
      .select();

    if (error) {
      console.error('❌ Insert error:', error);
      
      // Try with app.supabase auth instead
      console.log('\n💡 Trying alternative approach...');
      console.log('   The RLS policy is blocking inserts from anon key.');
      console.log('   Need to disable RLS temporarily or use service role key.');
      
      process.exit(1);
    }

    console.log('✅ Role inserted:', data);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

insert();
