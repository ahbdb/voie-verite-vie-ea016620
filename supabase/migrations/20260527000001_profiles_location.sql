-- Migration: Add location fields to profiles
-- Adds country, city (or diocese) to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country  text,
  ADD COLUMN IF NOT EXISTS city     text;

-- Index for future queries by country (e.g. to show local Catholic news)
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles (country);
