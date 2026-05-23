
-- Scheduled sessions table
CREATE TABLE public.scheduled_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL DEFAULT 'video' CHECK (session_type IN ('audio', 'video', 'live')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  estimated_duration INTEGER DEFAULT 60,
  access_type TEXT NOT NULL DEFAULT 'open' CHECK (access_type IN ('open', 'members', 'password')),
  access_password TEXT,
  recurrence TEXT DEFAULT 'once' CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly')),
  share_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  tags TEXT[] DEFAULT '{}',
  agenda JSONB DEFAULT '[]',
  video_room_id UUID REFERENCES public.video_rooms(id) ON DELETE SET NULL,
  recording_url TEXT,
  thumbnail_url TEXT,
  viewer_count INTEGER DEFAULT 0,
  platforms JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scheduled sessions"
  ON public.scheduled_sessions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sessions"
  ON public.scheduled_sessions FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Session reminders
CREATE TABLE public.session_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders"
  ON public.session_reminders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all reminders"
  ON public.session_reminders FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_scheduled_sessions_updated_at
  BEFORE UPDATE ON public.scheduled_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_sessions;
