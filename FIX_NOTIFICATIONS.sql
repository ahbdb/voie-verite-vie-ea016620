-- ══════════════════════════════════════════════════════════════════════════
-- FIX NOTIFICATIONS — à coller dans Supabase > SQL Editor > Run
-- Corrige les politiques RLS et crée/met à jour le RPC
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Corriger les politiques RLS de broadcast_notifications
--    (autoriser admin_principal en plus de admin)

DROP POLICY IF EXISTS "Anyone can read broadcast_notifications" ON public.broadcast_notifications;
DROP POLICY IF EXISTS "Only admins can create broadcast_notifications" ON public.broadcast_notifications;
DROP POLICY IF EXISTS "Only admins can update broadcast_notifications" ON public.broadcast_notifications;

CREATE POLICY "Anyone can read broadcast_notifications"
  ON public.broadcast_notifications FOR SELECT
  TO authenticated, anon
  USING (
    is_sent = true
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'admin_principal', 'moderator')
    )
  );

CREATE POLICY "Admins can create broadcast_notifications"
  ON public.broadcast_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'admin_principal')
    )
  );

CREATE POLICY "Admins can update broadcast_notifications"
  ON public.broadcast_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'admin_principal')
    )
  );

CREATE POLICY "Admins can delete broadcast_notifications"
  ON public.broadcast_notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'admin_principal')
    )
  );

-- 2. S'assurer que la colonne message existe dans user_notifications
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '';

-- 3. Recréer le RPC send_broadcast_notification (compatible avec les deux schémas)
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

  -- Fan-out vers tous les utilisateurs (ou ceux avec le bon rôle)
  IF v_broadcast.target_role IS NULL OR v_broadcast.target_role = 'all' THEN
    INSERT INTO public.user_notifications (
      user_id, broadcast_notification_id, title, body, message, icon, type, data
    )
    SELECT
      u.id,
      v_broadcast.id,
      v_broadcast.title,
      v_broadcast.body,
      COALESCE(v_broadcast.body, ''),
      v_broadcast.icon,
      v_broadcast.type,
      jsonb_build_object('broadcast_id', v_broadcast.id)
    FROM auth.users u
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_notifications (
      user_id, broadcast_notification_id, title, body, message, icon, type, data
    )
    SELECT
      ur.user_id,
      v_broadcast.id,
      v_broadcast.title,
      v_broadcast.body,
      COALESCE(v_broadcast.body, ''),
      v_broadcast.icon,
      v_broadcast.type,
      jsonb_build_object('broadcast_id', v_broadcast.id)
    FROM public.user_roles ur
    WHERE ur.role = v_broadcast.target_role
    ON CONFLICT DO NOTHING;
  END IF;

  -- Marquer comme envoyée
  UPDATE public.broadcast_notifications
  SET is_sent = true, sent_at = now()
  WHERE id = p_broadcast_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Vérification finale
SELECT
  (SELECT COUNT(*) FROM public.broadcast_notifications) AS broadcasts,
  (SELECT COUNT(*) FROM public.user_notifications) AS user_notifs,
  (SELECT COUNT(*) FROM public.fcm_tokens) AS push_tokens;
