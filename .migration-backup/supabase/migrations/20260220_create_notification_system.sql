-- Create broadcast_notifications table (notifications envoyées par les admins)
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text,
  icon text,
  type text DEFAULT 'announcement', -- 'greeting', 'reminder', 'announcement', 'update'
  target_role text, -- 'all', 'user', 'admin' or null for all
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  is_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user_notifications table (notifications individuelles par utilisateur)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_notification_id uuid REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  icon text,
  type text DEFAULT 'announcement',
  data jsonb, -- Extra data (action, url, etc)
  viewed_at timestamp with time zone,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_sent ON public.broadcast_notifications(is_sent);
CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_scheduled ON public.broadcast_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_created ON public.broadcast_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_broadcast_id ON public.user_notifications(broadcast_notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_viewed ON public.user_notifications(viewed_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON public.user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON public.user_notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcast_notifications
CREATE POLICY "Anyone can read broadcast_notifications"
  ON public.broadcast_notifications FOR SELECT
  TO authenticated, anon
  USING (is_sent = true OR (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )));

CREATE POLICY "Only admins can create broadcast_notifications"
  ON public.broadcast_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update broadcast_notifications"
  ON public.broadcast_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for user_notifications
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

-- RLS Policies for notification_settings
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

-- Create function to send broadcast notifications to all users
CREATE OR REPLACE FUNCTION public.send_broadcast_notification(
  p_broadcast_id uuid
) RETURNS void AS $$
DECLARE
  v_broadcast RECORD;
  v_user_record RECORD;
BEGIN
  -- Get the broadcast notification
  SELECT * INTO v_broadcast
  FROM public.broadcast_notifications
  WHERE id = p_broadcast_id;

  IF v_broadcast IS NULL THEN
    RAISE EXCEPTION 'Broadcast notification not found';
  END IF;

  -- Insert notification for each user based on target_role
  IF v_broadcast.target_role IS NULL OR v_broadcast.target_role = 'all' THEN
    -- Send to all authenticated users
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
    -- Send to users with specific role
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

  -- Mark broadcast as sent
  UPDATE public.broadcast_notifications
  SET is_sent = true, sent_at = now()
  WHERE id = p_broadcast_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.user_notifications
  SET is_read = true, viewed_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as viewed (clicked)
CREATE OR REPLACE FUNCTION public.mark_notification_viewed(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.user_notifications
  SET viewed_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS bigint AS $$
BEGIN
  RETURN COUNT(*)
  FROM public.user_notifications
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_notifications
  WHERE viewed_at IS NOT NULL
  AND viewed_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
