-- ================================================================
-- Migration : créer la table user_permissions
-- ================================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout gérer
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_permissions_admin_all' AND tablename = 'user_permissions' AND schemaname = 'public') THEN
    CREATE POLICY "user_permissions_admin_all" ON public.user_permissions
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Chaque utilisateur peut lire ses propres permissions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_permissions_self_read' AND tablename = 'user_permissions' AND schemaname = 'public') THEN
    CREATE POLICY "user_permissions_self_read" ON public.user_permissions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
