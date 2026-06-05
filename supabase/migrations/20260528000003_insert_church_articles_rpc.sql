-- ================================================================
-- Fonction RPC : insertion d'articles "church" (SECURITY DEFINER)
-- Contourne RLS pour permettre l'import depuis le client admin.
-- ================================================================

CREATE OR REPLACE FUNCTION public.insert_church_articles(articles jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  article jsonb;
  inserted int := 0;
BEGIN
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
        true,
        false,
        article->>'external_url',
        COALESCE(
          CASE WHEN article->>'published_at' <> '' THEN (article->>'published_at')::timestamptz END,
          now()
        )
      );
      inserted := inserted + 1;
    EXCEPTION
      WHEN unique_violation THEN NULL; -- skip duplicates
      WHEN OTHERS THEN NULL;           -- skip malformed rows
    END;
  END LOOP;
  RETURN inserted;
END;
$$;

-- Permettre à l'anon key d'appeler cette fonction (elle tourne en SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.insert_church_articles(jsonb) TO anon, authenticated;
