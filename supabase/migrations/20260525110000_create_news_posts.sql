-- ================================================================
-- Migration: news_posts — actualités de l'association
-- Run: Supabase Dashboard → SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS public.news_posts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  excerpt       text,
  content       text,
  image_url     text,
  video_url     text,
  category      text        NOT NULL DEFAULT 'association'
                            CHECK (category IN ('association', 'church', 'event', 'announcement')),
  author_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name   text,
  is_published  boolean     NOT NULL DEFAULT true,
  featured      boolean     NOT NULL DEFAULT false,
  tags          text[]      DEFAULT '{}',
  external_url  text,
  published_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_posts_select_published"
  ON public.news_posts FOR SELECT
  USING (is_published = true);

CREATE POLICY "news_posts_admin_all"
  ON public.news_posts FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS news_posts_published_idx ON public.news_posts (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS news_posts_category_idx  ON public.news_posts (category, published_at DESC);
CREATE INDEX IF NOT EXISTS news_posts_featured_idx  ON public.news_posts (featured, published_at DESC);

-- Storage bucket for news images (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('news-images', 'news-images', true)
-- ON CONFLICT (id) DO NOTHING;
