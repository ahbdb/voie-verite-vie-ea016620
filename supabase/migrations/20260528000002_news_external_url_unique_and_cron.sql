-- ================================================================
-- Migration : index unique sur news_posts.external_url + cron fetch-news
-- ================================================================

-- Index partial unique : un seul article par URL externe
CREATE UNIQUE INDEX IF NOT EXISTS news_posts_external_url_uq
  ON public.news_posts (external_url)
  WHERE external_url IS NOT NULL;

-- Cron job : appeler fetch-news toutes les 6 heures via pg_net
-- Requiert les extensions pg_cron et pg_net (activées par défaut sur Supabase)
SELECT cron.schedule(
  'fetch-catholic-news',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://kaddsojhnkyfavaulrfc.supabase.co/functions/v1/fetch-news',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
