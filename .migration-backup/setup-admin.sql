-- Script pour ajouter le rôle admin à ahdybau@gmail.com

-- 1. Vérifier l'ID utilisateur
SELECT id, email FROM auth.users WHERE email = 'ahdybau@gmail.com';

-- 2. Vérifier le profil
SELECT * FROM public.profiles WHERE email = 'ahdybau@gmail.com';

-- 3. Vérifier les rôles actuels
SELECT * FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com');

-- 4. Insérer ou mettre à jour le rôle admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users 
WHERE email = 'ahdybau@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Vérifier le résultat
SELECT ur.user_id, ur.role, p.email 
FROM public.user_roles ur 
JOIN public.profiles p ON ur.user_id = p.id 
WHERE p.email = 'ahdybau@gmail.com';
