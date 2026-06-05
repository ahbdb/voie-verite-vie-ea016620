-- ================================================================
-- Migration : créer les buckets Storage Supabase
-- Exécuter dans : Supabase Dashboard → SQL Editor
-- ================================================================

-- Bucket news-images (images des actualités)
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket video-flyers (affiches des lives/appels)
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-flyers', 'video-flyers', true)
ON CONFLICT (id) DO NOTHING;

-- ── Policies storage.objects ──────────────────────────────────────────────────

-- Lecture publique (tout le monde peut voir les images)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'news_images_public_read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "news_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'news-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'video_flyers_public_read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "video_flyers_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'video-flyers');
  END IF;
END $$;

-- Upload (admins uniquement)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'news_images_admin_upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "news_images_admin_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'news-images' AND public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'video_flyers_admin_upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "video_flyers_admin_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'video-flyers' AND public.is_admin(auth.uid()));
  END IF;
END $$;

-- Mise à jour (admins)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'news_images_admin_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "news_images_admin_update" ON storage.objects FOR UPDATE USING (bucket_id = 'news-images' AND public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'video_flyers_admin_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "video_flyers_admin_update" ON storage.objects FOR UPDATE USING (bucket_id = 'video-flyers' AND public.is_admin(auth.uid()));
  END IF;
END $$;

-- Suppression (admins)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'news_images_admin_delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "news_images_admin_delete" ON storage.objects FOR DELETE USING (bucket_id = 'news-images' AND public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'video_flyers_admin_delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "video_flyers_admin_delete" ON storage.objects FOR DELETE USING (bucket_id = 'video-flyers' AND public.is_admin(auth.uid()));
  END IF;
END $$;
