-- Migration pour ajouter automatiquement le rôle admin à ahdybau@gmail.com
-- Created: 2025-12-08

-- Ajouter le rôle admin au superadmin ahdybau@gmail.com
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur ahdybau@gmail.com
  SELECT id INTO admin_user_id FROM auth.users 
  WHERE email = 'ahdybau@gmail.com' 
  LIMIT 1;

  -- Si l'utilisateur existe
  IF admin_user_id IS NOT NULL THEN
    -- Insérer le rôle admin s'il n'existe pas
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role added to ahdybau@gmail.com';
  ELSE
    RAISE WARNING 'User ahdybau@gmail.com not found in auth.users';
  END IF;
END $$;
