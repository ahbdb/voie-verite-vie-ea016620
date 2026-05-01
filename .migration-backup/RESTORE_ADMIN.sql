-- ⚠️ COPY-PASTE THIS INTO SUPABASE SQL EDITOR
-- This will make ahdybau@gmail.com an admin_principal again

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin_principal'::public.app_role
FROM auth.users
WHERE email = 'ahdybau@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT email, role FROM auth.users 
LEFT JOIN public.user_roles ON auth.users.id = public.user_roles.user_id
WHERE email = 'ahdybau@gmail.com';
