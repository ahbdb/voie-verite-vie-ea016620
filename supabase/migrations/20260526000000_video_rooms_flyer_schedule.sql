-- Add flyer image and scheduling to video rooms
ALTER TABLE video_rooms
  ADD COLUMN IF NOT EXISTS flyer_url TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Storage bucket for room flyer images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-flyers', 'video-flyers', true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='objects' AND schemaname='storage' AND policyname='Admins upload flyers'
  ) THEN
    CREATE POLICY "Admins upload flyers" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'video-flyers');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='objects' AND schemaname='storage' AND policyname='Public view flyers'
  ) THEN
    CREATE POLICY "Public view flyers" ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'video-flyers');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='objects' AND schemaname='storage' AND policyname='Admins delete flyers'
  ) THEN
    CREATE POLICY "Admins delete flyers" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'video-flyers');
  END IF;
END$$;
