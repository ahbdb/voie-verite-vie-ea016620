-- ================================================================
-- Migration: Create testimonials table
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS public.testimonials (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  titre       text        NOT NULL,
  recit       text        NOT NULL,
  categorie   text        NOT NULL DEFAULT 'foi',
  prenom      text,
  anonymous   boolean     NOT NULL DEFAULT false,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'published', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- ── Read: everyone can see published testimonials ──────────────
CREATE POLICY "testimonials_select_published"
  ON public.testimonials FOR SELECT
  USING (status = 'published');

-- ── Insert: anyone (auth or anon) can submit ───────────────────
CREATE POLICY "testimonials_insert_any"
  ON public.testimonials FOR INSERT
  WITH CHECK (true);

-- ── Admin full access ──────────────────────────────────────────
CREATE POLICY "testimonials_admin_all"
  ON public.testimonials FOR ALL
  USING (public.is_admin(auth.uid()));

-- Optional: index for faster status queries
CREATE INDEX IF NOT EXISTS testimonials_status_idx ON public.testimonials (status, created_at DESC);
