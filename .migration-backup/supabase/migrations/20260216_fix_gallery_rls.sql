-- Fix RLS for gallery so `admin_principal` (and `admin`) are recognized
-- Replaces policies that used has_role(..., 'admin') with public.is_admin(auth.uid())

BEGIN;

-- Gallery images: allow admin_principal and admin to perform all actions
DROP POLICY IF EXISTS "Admins can manage gallery" ON public.gallery_images;
CREATE POLICY "Admins can manage gallery" ON public.gallery_images
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Storage: allow admins to upload/delete objects in the `gallery` bucket
DROP POLICY IF EXISTS "Admins can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON storage.objects;

CREATE POLICY "Admins can upload gallery images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete gallery images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'gallery' AND public.is_admin(auth.uid()));

COMMIT;
