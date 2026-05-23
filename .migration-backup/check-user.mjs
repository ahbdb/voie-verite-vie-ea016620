import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://kaddsojhnkyfavaulrfc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs"
);

async function check() {
  // Check profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(10);

  console.log('=== EXISTING PROFILES ===');
  if (pError) {
    console.log('Error:', pError);
  } else {
    console.log(JSON.stringify(profiles, null, 2));
  }

  // Check user_roles
  const { data: roles, error: rError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .limit(20);

  console.log('\n=== EXISTING ROLES ===');
  if (rError) {
    console.log('Error:', rError);
  } else {
    console.log(JSON.stringify(roles, null, 2));
  }
}

check();
