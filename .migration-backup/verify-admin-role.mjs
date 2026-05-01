import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kaddsojhnkyfavaulrfc.supabase.co';
const SERVICE_ROLE_KEY = 're_YcztZdEG_7MsuMCLjcw4rf49PeCCmTxBw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verify() {
  try {
    console.log('🔍 Vérification du rôle admin...\n');

    // 1. Trouver l'utilisateur
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Erreur:', usersError);
      return;
    }

    const adminUser = users.users.find(u => u.email === 'ahdybau@gmail.com');
    
    if (!adminUser) {
      console.error('❌ Utilisateur ahdybau@gmail.com NOT FOUND');
      return;
    }

    console.log('✅ Utilisateur trouvé:');
    console.log('   Email:', adminUser.email);
    console.log('   ID:', adminUser.id);
    console.log('');

    // 2. Vérifier les rôles dans user_roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id);

    if (rolesError) {
      console.error('❌ Erreur query user_roles:', rolesError);
      return;
    }

    console.log('📋 Rôles actuels dans la base:');
    if (!roles || roles.length === 0) {
      console.log('   ⚠️  AUCUN RÔLE! La table user_roles est VIDE pour cet utilisateur!');
      console.log('   ');
      console.log('   🔧 SOLUTION: Exécutez ce SQL dans Supabase:');
      console.log('   ');
      console.log('   INSERT INTO public.user_roles (user_id, role)');
      console.log(`   VALUES ('${adminUser.id}', 'admin_principal'::public.app_role);`);
    } else {
      roles.forEach(r => {
        console.log(`   ✅ ${r.role}`);
      });
    }

  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

verify();
