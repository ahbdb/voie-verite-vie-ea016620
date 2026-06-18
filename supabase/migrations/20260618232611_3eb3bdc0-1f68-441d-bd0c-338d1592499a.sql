CREATE TABLE public.rss_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  title text NOT NULL,
  excerpt text,
  image_url text,
  external_url text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'church',
  author_name text,
  published_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  broken_check_count integer NOT NULL DEFAULT 0,
  is_broken boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rss_articles_published_at_idx ON public.rss_articles (published_at DESC);
CREATE INDEX rss_articles_category_idx ON public.rss_articles (category);
CREATE INDEX rss_articles_last_seen_idx ON public.rss_articles (last_seen_at);

GRANT SELECT ON public.rss_articles TO anon;
GRANT SELECT ON public.rss_articles TO authenticated;
GRANT ALL ON public.rss_articles TO service_role;

ALTER TABLE public.rss_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rss_articles public read"
  ON public.rss_articles FOR SELECT
  USING (is_broken = false);

CREATE POLICY "rss_articles admin manage"
  ON public.rss_articles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER rss_articles_set_updated_at
  BEFORE UPDATE ON public.rss_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();