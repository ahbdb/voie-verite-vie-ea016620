-- User Permissions System - Granular permission control per user

-- Create permission types enum
CREATE TYPE public.user_permission AS ENUM (
  'manage_readings',           -- Gérer les lectures bibliques
  'manage_prayers',            -- Gérer les prières
  'manage_gallery',            -- Gérer la galerie
  'manage_users',              -- Gérer les utilisateurs
  'manage_contacts',           -- Voir et gérer les contact
  'view_contacts',             -- Voir les contacts (sans supprimer)
  'create_notifications',      -- Créer des notifications
  'moderate_content',          -- Modérer et éditer les contenus
  'manage_activities',         -- Gérer les activités
  'manage_faq',                -- Gérer la FAQ
  'manage_about',              -- Gérer la page À propos
  'view_analytics'             -- Voir les analytics
);

-- Create user_permissions table to store custom permissions per user
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission public.user_permission NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, permission)
);

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission public.user_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission = _permission
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin_principal'
  )
$$;

-- Function to check if user has ANY of multiple permissions
CREATE OR REPLACE FUNCTION public.has_any_permission(_user_id uuid, _permissions public.user_permission[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission = ANY(_permissions)
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_principal', 'admin')
  )
$$;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission public.user_permission)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permission
  FROM public.user_permissions
  WHERE user_id = _user_id
  UNION ALL
  SELECT (enum_range(NULL::public.user_permission))[s]
  FROM (SELECT generate_series(1, (SELECT count(*) FROM (SELECT enum_range(NULL::public.user_permission)) t(e), LATERAL unnest(e) e WHERE e::text != ''))) s
  WHERE EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin_principal'
  )
$$;

-- RLS Policies for user_permissions table
CREATE POLICY "Admin principal can manage all permissions"
ON public.user_permissions FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin_principal'
));

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, public.user_permission) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_permission(uuid, public.user_permission[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;
