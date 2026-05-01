donne m# 🔧 Instructions pour Appliquer la Migration RPC

## ⚡ Problème Identifié

Le hook `useAdmin` essaie de lire la table `user_roles` directement, mais les **RLS (Row Level Security) policies** empêchent l'accès. C'est pourquoi le lien Admin ne s'affiche pas, même si tu as le rôle `admin_principal`.

## ✅ Solution: Appliquer la Migration RPC

Tu dois exécuter le SQL ci-dessous dans le Supabase Dashboard.

### 📋 Étapes:

1. **Va sur https://app.supabase.com**
2. **Sélectionne ton projet** `voie-verite-vie`
3. **Dans le menu à gauche**, clique sur **SQL Editor**
4. **Clique sur "Create a new query"**
5. **Copie-colle le SQL ci-dessous:**

```sql
-- Get user roles - secure RPC function
-- This function returns the roles of the current authenticated user

CREATE OR REPLACE FUNCTION public.get_current_user_roles()
RETURNS TABLE(
  user_id uuid,
  role app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    user_id,
    role
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;

-- Function to get user's highest admin role
CREATE OR REPLACE FUNCTION public.get_user_admin_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role IN ('admin_principal', 'admin', 'moderator')
  ORDER BY 
    CASE role
      WHEN 'admin_principal' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'moderator' THEN 3
      ELSE 4
    END
  LIMIT 1;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_role() TO authenticated;
```

6. **Clique sur "Run"** (ou Ctrl+Enter)
7. ✅ **Recharge ta page de l'app** (Ctrl+R ou Cmd+R)

## 🎯 Résultat Attendu

Le lien **Admin** devrait maintenant apparaître dans la navigation en haut à droite! 🛡️

## 📱 Comment Tester

1. Ouvre la console (F12 → Console)
2. Cherche les logs qui commencent par `📱 [Navigation]`
3. Tu devrais voir: `{user: 'ahdybau@gmail.com', isAdmin: true, ...}`

## 🆘 Si Ça Ne Marche Pas

- **Réinspecteur la console** pour les erreurs
- **Partage les logs** rouges (❌ [useAdmin])
- **Vérifie** que tu es connecté avec `ahdybau@gmail.com`
- **Essaie de vider le cache** du navigateur (Ctrl+Shift+R)
