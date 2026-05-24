-- ══════════════════════════════════════════════════════════════════════════
-- AUTO_NOTIFICATIONS.sql
-- Notifications automatiques — comme WhatsApp
-- ⚠️ Remplace <SERVICE_ROLE_KEY> par ta clé (Supabase → Settings → API)
-- ══════════════════════════════════════════════════════════════════════════

-- 0. Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ══════════════════════════════════════════════════════════════════════════
-- PARTIE 1 : CRONS — notifications quotidiennes programmées
-- ══════════════════════════════════════════════════════════════════════════

-- Supprimer les anciens jobs s'ils existent
SELECT cron.unschedule('morning-prayer-notification') FROM cron.job WHERE jobname = 'morning-prayer-notification';
SELECT cron.unschedule('midday-notification') FROM cron.job WHERE jobname = 'midday-notification';
SELECT cron.unschedule('evening-prayer-notification') FROM cron.job WHERE jobname = 'evening-prayer-notification';

-- Prière du matin — 6h UTC = 7h WAT (Cameroun)
SELECT cron.schedule(
  'morning-prayer-notification',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kaddsojhnkyfavaulrfc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{"type":"morning"}'::jsonb
  );
  $$
);

-- Angelus de midi — 11h UTC = 12h WAT
SELECT cron.schedule(
  'midday-notification',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kaddsojhnkyfavaulrfc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{"type":"midday"}'::jsonb
  );
  $$
);

-- Prière du soir — 19h UTC = 20h WAT
SELECT cron.schedule(
  'evening-prayer-notification',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kaddsojhnkyfavaulrfc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{"type":"evening"}'::jsonb
  );
  $$
);

-- ══════════════════════════════════════════════════════════════════════════
-- PARTIE 2 : TRIGGERS — notification automatique sur nouveau contenu
-- ══════════════════════════════════════════════════════════════════════════

-- Fonction générique d'envoi push via pg_net
CREATE OR REPLACE FUNCTION private.push_on_new_content(
  p_title text,
  p_body text,
  p_url text,
  p_action text,
  p_urgency text DEFAULT 'normal'
) RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://kaddsojhnkyfavaulrfc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object(
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'action', p_action
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Trigger : nouvelle activité ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.notify_new_activity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM private.push_on_new_content(
    '📅 Nouvelle activité',
    COALESCE(NEW.title, 'Une nouvelle activité a été ajoutée'),
    '/activities',
    'activity'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_activity ON public.activities;
CREATE TRIGGER trg_notify_new_activity
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION private.notify_new_activity();

-- ── Trigger : nouveau live / session ─────────────────────────────────────

CREATE OR REPLACE FUNCTION private.notify_new_session()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM private.push_on_new_content(
    '📺 En direct bientôt',
    COALESCE(NEW.title, 'Une session en direct démarre bientôt'),
    '/calls-lives',
    'live'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_session ON public.scheduled_sessions;
CREATE TRIGGER trg_notify_new_session
  AFTER INSERT ON public.scheduled_sessions
  FOR EACH ROW EXECUTE FUNCTION private.notify_new_session();

-- ── Trigger : nouvelle photo dans la galerie ──────────────────────────────

CREATE OR REPLACE FUNCTION private.notify_new_gallery()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM private.push_on_new_content(
    '🖼️ Nouvelle photo',
    COALESCE(NEW.caption, 'De nouvelles photos ont été ajoutées à la galerie'),
    '/gallery',
    'gallery'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_gallery ON public.gallery_images;
CREATE TRIGGER trg_notify_new_gallery
  AFTER INSERT ON public.gallery_images
  FOR EACH ROW EXECUTE FUNCTION private.notify_new_gallery();

-- ── Trigger : nouvelle intention de prière ────────────────────────────────

CREATE OR REPLACE FUNCTION private.notify_new_prayer()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM private.push_on_new_content(
    '🙏 Nouvelle intention de prière',
    COALESCE(NEW.title, SUBSTRING(NEW.content, 1, 80), 'Une nouvelle intention de prière a été partagée'),
    '/prayer-forum',
    'general'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_prayer ON public.prayer_requests;
CREATE TRIGGER trg_notify_new_prayer
  AFTER INSERT ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION private.notify_new_prayer();

-- ── Trigger : nouvelle neuvaine ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.notify_new_neuvaine()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM private.push_on_new_content(
    '📿 Nouvelle neuvaine',
    COALESCE(NEW.title, 'Une nouvelle neuvaine est disponible'),
    '/neuvaines',
    'general'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_neuvaine ON public.neuvaines;
CREATE TRIGGER trg_notify_new_neuvaine
  AFTER INSERT ON public.neuvaines
  FOR EACH ROW EXECUTE FUNCTION private.notify_new_neuvaine();

-- ══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION
-- ══════════════════════════════════════════════════════════════════════════

-- Voir les crons programmés
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
