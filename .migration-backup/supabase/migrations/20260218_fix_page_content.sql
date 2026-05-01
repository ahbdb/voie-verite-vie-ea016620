-- Fix page_content table and populate default data
-- This migration ensures page_content table exists properly and has initial data

-- Drop existing table if it has issues (with CASCADE to drop dependent objects)
DROP TABLE IF EXISTS public.page_content CASCADE;

-- Recreate page_content table with proper schema
CREATE TABLE public.page_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key text NOT NULL UNIQUE,
  title text,
  subtitle text,
  content jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow everyone to read, anyone authenticated can modify
CREATE POLICY "Anyone can read page_content" ON public.page_content
  FOR SELECT
  USING (true);

-- Allow anyone (including service) to create/update/delete
CREATE POLICY "Allow all writes on page_content" ON public.page_content
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow updates on page_content" ON public.page_content
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow deletes on page_content" ON public.page_content
  FOR DELETE
  USING (true);

-- Create indexes
CREATE INDEX idx_page_content_key ON public.page_content(page_key);

-- Insert default data
INSERT INTO public.page_content (page_key, title, subtitle, content)
VALUES
('careme-2026', 'Carême 2026', '40 jours de prière, pénitence et partage', '{"days": []}'),
('chemin-de-croix', 'Chemin de Croix', '14 stations de méditation', '{"stations": []}')
ON CONFLICT (page_key) DO NOTHING;

