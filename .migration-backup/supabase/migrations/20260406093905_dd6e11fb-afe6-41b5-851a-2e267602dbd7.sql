
CREATE TABLE public.activity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  translations JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  cover_image_url TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  linked_activities TEXT[] DEFAULT '{}',
  linked_galleries TEXT[] DEFAULT '{}',
  linked_spiritual_practices TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published reports"
ON public.activity_reports
FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage reports"
ON public.activity_reports
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
