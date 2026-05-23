import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://kaddsojhnkyfavaulrfc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"
);

async function find() {
  console.log('🔍 Searching for all users...\n');

  // Get all profiles
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('📋 PROFILES:', JSON.stringify(profiles, null, 2));

  // Get all roles
  const { data: roles } = await supabase.from('user_roles').select('*');
  console.log('\n👑 ROLES:', JSON.stringify(roles, null, 2));

  if (profiles && profiles.length > 0) {
    console.log('\n✅ Users found!');
    profiles.forEach(p => {
      console.log(`   - ${p.email} (ID: ${p.id})`);
    });
  } else {
    console.log('\n⚠️ No users found');
  }
}

find();
