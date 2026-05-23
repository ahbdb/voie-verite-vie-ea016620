
-- Table des neuvaines
CREATE TABLE public.neuvaines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  saint_name text NOT NULL,
  description text,
  introduction text,
  common_prayers jsonb DEFAULT '{}'::jsonb,
  days jsonb DEFAULT '[]'::jsonb,
  conclusion jsonb DEFAULT '{}'::jsonb,
  pdf_url text,
  image_url text,
  is_published boolean DEFAULT true,
  total_days integer DEFAULT 9,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.neuvaines ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view published neuvaines"
  ON public.neuvaines FOR SELECT
  USING (is_published = true);

-- Admin CRUD
CREATE POLICY "Admins can manage neuvaines"
  ON public.neuvaines FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Updated at trigger
CREATE TRIGGER set_neuvaines_updated_at
  BEFORE UPDATE ON public.neuvaines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();
