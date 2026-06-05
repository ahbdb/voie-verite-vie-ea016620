-- ================================================================
-- 1. Add birth_date to profiles (was missing from 20260527000000)
-- ================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date;

-- ================================================================
-- 2. RPC reimport_church_articles (SECURITY DEFINER)
--    Supprime les articles Église sans image, réinsère avec images.
-- ================================================================
CREATE OR REPLACE FUNCTION public.reimport_church_articles(articles jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  article jsonb;
  inserted int := 0;
BEGIN
  DELETE FROM news_posts
  WHERE category = 'church' AND (image_url IS NULL OR image_url = '');

  FOR article IN SELECT * FROM jsonb_array_elements(articles)
  LOOP
    BEGIN
      INSERT INTO news_posts (
        title, excerpt, image_url, category, author_name,
        is_published, featured, external_url, published_at
      ) VALUES (
        article->>'title',
        NULLIF(article->>'excerpt', ''),
        NULLIF(article->>'image_url', ''),
        'church',
        NULLIF(article->>'author_name', ''),
        true, false,
        article->>'external_url',
        COALESCE(
          CASE WHEN article->>'published_at' <> ''
               THEN (article->>'published_at')::timestamptz END,
          now()
        )
      );
      inserted := inserted + 1;
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
  END LOOP;
  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reimport_church_articles(jsonb) TO anon, authenticated;

-- ================================================================
-- 3. Fix &amp; in existing image_url values
-- ================================================================
UPDATE public.news_posts
SET image_url = replace(image_url, '&amp;', '&')
WHERE image_url LIKE '%&amp;%';
