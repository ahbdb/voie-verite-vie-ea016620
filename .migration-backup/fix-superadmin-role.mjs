import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSuperadminRole() {
  try {
    console.log('Starting superadmin role fix...');
    
    // Execute the migration SQL directly
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        DECLARE
          admin_user_id uuid;
          user_email text;
        BEGIN
          -- Get the user ID for ahdybau@gmail.com from auth.users
          SELECT id, email INTO admin_user_id, user_email FROM auth.users 
          WHERE email = 'ahdybau@gmail.com' 
          LIMIT 1;

          IF admin_user_id IS NOT NULL THEN
            RAISE NOTICE 'Found superadmin user: % with ID: %', user_email, admin_user_id;
            
            -- Delete ALL existing admin roles for this user
            DELETE FROM public.user_roles 
            WHERE user_id = admin_user_id 
              AND role IN ('admin', 'moderator', 'admin_principal');
            
            RAISE NOTICE 'Deleted old admin roles';
            
            -- Insert fresh admin_principal role
            INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
            VALUES (
              admin_user_id, 
              'admin_principal'::app_role,
              NOW(),
              NOW()
            );
            
            RAISE NOTICE 'Set admin_principal role for superadmin';
          ELSE
            RAISE WARNING 'Superadmin user (ahdybau@gmail.com) not found in auth.users!';
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('Error executing SQL:', error);
      return;
    }

    console.log('✅ Superadmin role fixed successfully!');
    console.log('Response:', data);

  } catch (err) {
    console.error('Error:', err);
  }
}

fixSuperadminRole();
