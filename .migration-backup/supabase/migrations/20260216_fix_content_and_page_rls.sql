-- Fix RLS for content-management tables created earlier with `has_role(..., 'admin')`
-- Replaces legacy `has_role(..., 'admin')` policies with checks to `public.is_admin(auth.uid())`
-- Safe to re-run (uses DROP POLICY IF EXISTS)

BEGIN;

-- FAQ items
DROP POLICY IF EXISTS "Admins can manage FAQ" ON public.faq_items;
CREATE POLICY "Admins can manage FAQ" ON public.faq_items
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Activities
DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;
CREATE POLICY "Admins can manage activities" ON public.activities
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Page content (home/about/author/design)
DROP POLICY IF EXISTS "Admins can manage page content" ON public.page_content;
CREATE POLICY "Admins can manage page content" ON public.page_content
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Gallery: ensure storage policies are correct (idempotent)
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
