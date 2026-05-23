-- Stabilize roles and page content security
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all deletes on page_content" ON public.page_content;
DROP POLICY IF EXISTS "Allow all inserts on page_content" ON public.page_content;
DROP POLICY IF EXISTS "Allow all select on page_content" ON public.page_content;
DROP POLICY IF EXISTS "Allow all updates on page_content" ON public.page_content;
DROP POLICY IF EXISTS "Anyone can read page_content" ON public.page_content;

CREATE POLICY "Anyone can read page_content"
ON public.page_content
FOR SELECT
USING (true);

-- Extend video rooms
ALTER TABLE public.video_rooms
ADD COLUMN IF NOT EXISTS room_type text NOT NULL DEFAULT 'video',
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_video_rooms_updated_at'
  ) THEN
    CREATE TRIGGER set_video_rooms_updated_at
    BEFORE UPDATE ON public.video_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();
  END IF;
END $$;

-- Replace admin-only room access with admin-create / authenticated-join model
DROP POLICY IF EXISTS "Admins can create video rooms" ON public.video_rooms;
DROP POLICY IF EXISTS "Admins can delete video rooms" ON public.video_rooms;
DROP POLICY IF EXISTS "Admins can update video rooms" ON public.video_rooms;
DROP POLICY IF EXISTS "Admins can view video rooms" ON public.video_rooms;

CREATE POLICY "Admins can create video rooms"
ON public.video_rooms
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Admins can update video rooms"
ON public.video_rooms
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete video rooms"
ON public.video_rooms
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view joinable video rooms"
ON public.video_rooms
FOR SELECT
TO authenticated
USING (status <> 'ended' OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can join rooms as themselves" ON public.video_room_participants;
DROP POLICY IF EXISTS "Admins can remove participants" ON public.video_room_participants;
DROP POLICY IF EXISTS "Admins can update their participant state" ON public.video_room_participants;
DROP POLICY IF EXISTS "Admins can view room participants" ON public.video_room_participants;

CREATE POLICY "Authenticated users can view room participants"
ON public.video_room_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.video_rooms vr
    WHERE vr.id = video_room_participants.room_id
      AND (vr.status <> 'ended' OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Authenticated users can join rooms as themselves"
ON public.video_room_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.video_rooms vr
    WHERE vr.id = video_room_participants.room_id
      AND vr.status <> 'ended'
  )
);

CREATE POLICY "Users can update their participant state"
ON public.video_room_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can remove themselves from rooms"
ON public.video_room_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete room signals" ON public.video_room_signals;
DROP POLICY IF EXISTS "Admins can send room signals" ON public.video_room_signals;
DROP POLICY IF EXISTS "Admins can view room signals" ON public.video_room_signals;

CREATE POLICY "Participants can view relevant room signals"
ON public.video_room_signals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.video_rooms vr
    WHERE vr.id = video_room_signals.room_id
      AND (vr.status <> 'ended' OR is_admin(auth.uid()))
  )
  AND (recipient_id IS NULL OR recipient_id = auth.uid() OR sender_id = auth.uid())
);

CREATE POLICY "Participants can send room signals"
ON public.video_room_signals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.video_rooms vr
    WHERE vr.id = video_room_signals.room_id
      AND vr.status <> 'ended'
  )
  AND EXISTS (
    SELECT 1
    FROM public.video_room_participants p
    WHERE p.room_id = video_room_signals.room_id
      AND p.user_id = auth.uid()
      AND p.is_active = true
  )
);

CREATE POLICY "Participants can delete consumed room signals"
ON public.video_room_signals
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR recipient_id = auth.uid() OR is_admin(auth.uid()));

-- Persistent room chat
CREATE TABLE IF NOT EXISTS public.video_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.video_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.video_room_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_video_room_messages_room_id_created_at
ON public.video_room_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_room_messages_user_id
ON public.video_room_messages(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_video_room_messages_updated_at'
  ) THEN
    CREATE TRIGGER set_video_room_messages_updated_at
    BEFORE UPDATE ON public.video_room_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();
  END IF;
END $$;

DROP POLICY IF EXISTS "Participants can view room messages" ON public.video_room_messages;
DROP POLICY IF EXISTS "Participants can create room messages" ON public.video_room_messages;
DROP POLICY IF EXISTS "Participants can update own room messages" ON public.video_room_messages;
DROP POLICY IF EXISTS "Participants can delete own room messages" ON public.video_room_messages;

CREATE POLICY "Participants can view room messages"
ON public.video_room_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.video_rooms vr
    WHERE vr.id = video_room_messages.room_id
      AND (vr.status <> 'ended' OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Participants can create room messages"
ON public.video_room_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND length(btrim(content)) > 0
  AND EXISTS (
    SELECT 1
    FROM public.video_room_participants p
    WHERE p.room_id = video_room_messages.room_id
      AND p.user_id = auth.uid()
      AND p.is_active = true
  )
);

CREATE POLICY "Participants can update own room messages"
ON public.video_room_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Participants can delete own room messages"
ON public.video_room_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Message reactions (likes / emojis)
CREATE TABLE IF NOT EXISTS public.video_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.video_room_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.video_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.video_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_video_message_reactions_message_id
ON public.video_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_video_message_reactions_room_id
ON public.video_message_reactions(room_id);

DROP POLICY IF EXISTS "Participants can view room reactions" ON public.video_message_reactions;
DROP POLICY IF EXISTS "Participants can create room reactions" ON public.video_message_reactions;
DROP POLICY IF EXISTS "Participants can delete own room reactions" ON public.video_message_reactions;

CREATE POLICY "Participants can view room reactions"
ON public.video_message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.video_rooms vr
    WHERE vr.id = video_message_reactions.room_id
      AND (vr.status <> 'ended' OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Participants can create room reactions"
ON public.video_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND length(btrim(emoji)) > 0
  AND EXISTS (
    SELECT 1
    FROM public.video_room_participants p
    WHERE p.room_id = video_message_reactions.room_id
      AND p.user_id = auth.uid()
      AND p.is_active = true
  )
  AND EXISTS (
    SELECT 1
    FROM public.video_room_messages m
    WHERE m.id = video_message_reactions.message_id
      AND m.room_id = video_message_reactions.room_id
  )
);

CREATE POLICY "Participants can delete own room reactions"
ON public.video_message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Realtime publication for features that depend on live updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'page_content'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.page_content;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'video_room_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_room_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'video_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_message_reactions;
  END IF;
END $$;