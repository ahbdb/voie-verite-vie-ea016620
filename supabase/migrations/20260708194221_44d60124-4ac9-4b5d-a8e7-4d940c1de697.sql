
ALTER TABLE public.rss_articles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.news_posts   ADD COLUMN IF NOT EXISTS country TEXT;
CREATE INDEX IF NOT EXISTS idx_rss_country_pub  ON public.rss_articles(country, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_country_pub ON public.news_posts(country, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_published    ON public.rss_articles(published_at DESC);
