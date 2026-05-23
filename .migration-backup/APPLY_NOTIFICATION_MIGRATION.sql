-- ================================================
-- Migration: Système de Notifications Persistantes
-- Date: 2026-02-20
-- Description: Tables pour les notifications broadcast
-- Usage: Copier-coller directement dans Supabase SQL Editor
-- ================================================

-- 1️⃣ Créer la table broadcast_notifications
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text,
  icon text,
  type text DEFAULT 'announcement',
  target_role text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  is_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2️⃣ Créer la table user_notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_notification_id uuid REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  icon text,
  type text DEFAULT 'announcement',
  data jsonb,
  viewed_at timestamp with time zone,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3️⃣ Créer la table notification_settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4️⃣ Créer les indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_sent ON public.broadcast_notifications(is_sent);
CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_created ON public.broadcast_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON public.user_notifications(user_id, created_at DESC);

-- 5️⃣ Activer Row Level Security
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- 6️⃣ Créer les RLS Policies
DROP POLICY IF EXISTS "Anyone can read broadcast_notifications" ON public.broadcast_notifications;
DROP POLICY IF EXISTS "Only admins can create broadcast_notifications" ON public.broadcast_notifications;
DROP POLICY IF EXISTS "Only admins can update broadcast_notifications" ON public.broadcast_notifications;

CREATE POLICY "Anyone can read broadcast_notifications"
  ON public.broadcast_notifications FOR SELECT
  TO authenticated, anon
  USING (is_sent = true);

CREATE POLICY "Only admins can create broadcast_notifications"
  ON public.broadcast_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'admin_principal', 'superadmin')
    )
  );

CREATE POLICY "Only admins can update broadcast_notifications"
  ON public.broadcast_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'admin_principal', 'superadmin')
    )
  );

-- 7️⃣ RLS Policies pour user_notifications
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "System can insert user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.user_notifications;

CREATE POLICY "Users can read their own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert user_notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.user_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 8️⃣ RLS Policies pour notification_settings
DROP POLICY IF EXISTS "Users can read their own settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.notification_settings;

CREATE POLICY "Users can read their own settings"
  ON public.notification_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
  ON public.notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.notification_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 9️⃣ AUX - Créer la fonction send_broadcast_notification
DROP FUNCTION IF EXISTS public.send_broadcast_notification(uuid);
CREATE OR REPLACE FUNCTION public.send_broadcast_notification(
  p_broadcast_id uuid
) RETURNS void AS $$
DECLARE
  v_broadcast RECORD;
BEGIN
  SELECT * INTO v_broadcast
  FROM public.broadcast_notifications
  WHERE id = p_broadcast_id;

  IF v_broadcast IS NULL THEN
    RAISE EXCEPTION 'Broadcast notification not found';
  END IF;

  IF v_broadcast.target_role IS NULL OR v_broadcast.target_role = 'all' THEN
    INSERT INTO public.user_notifications (
      user_id, broadcast_notification_id, title, body, icon, type, data
    )
    SELECT
      auth.users.id,
      v_broadcast.id,
      v_broadcast.title,
      v_broadcast.body,
      v_broadcast.icon,
      v_broadcast.type,
      jsonb_build_object('broadcast_id', v_broadcast.id)
    FROM auth.users
    WHERE auth.users.id != v_broadcast.created_by;
  ELSE
    INSERT INTO public.user_notifications (
      user_id, broadcast_notification_id, title, body, icon, type, data
    )
    SELECT
      ur.user_id,
      v_broadcast.id,
      v_broadcast.title,
      v_broadcast.body,
      v_broadcast.icon,
      v_broadcast.type,
      jsonb_build_object('broadcast_id', v_broadcast.id)
    FROM public.user_roles ur
    WHERE ur.role = v_broadcast.target_role
    AND ur.user_id != v_broadcast.created_by;
  END IF;

  UPDATE public.broadcast_notifications
  SET is_sent = true, sent_at = now()
  WHERE id = p_broadcast_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔟 Créer la fonction mark_notification_read
DROP FUNCTION IF EXISTS public.mark_notification_read(uuid);
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.user_notifications
  SET is_read = true, viewed_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ MIGRATION COMPLÈTE
-- Les tables et fonctions sont maintenant créées et prêtes à utiliser!
-- 
-- Vérification:
SELECT 'broadcast_notifications' as table_name, COUNT(*) as count FROM public.broadcast_notifications
UNION ALL
SELECT 'user_notifications', COUNT(*) FROM public.user_notifications
UNION ALL
SELECT 'notification_settings', COUNT(*) FROM public.notification_settings;
