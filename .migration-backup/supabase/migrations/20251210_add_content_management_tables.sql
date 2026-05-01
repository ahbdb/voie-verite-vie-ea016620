-- Create page_content table for About page
CREATE TABLE IF NOT EXISTS public.page_content (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  page_slug text UNIQUE NOT NULL,
  content jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  icon text,
  "order" integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create gallery_items table
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create prayer_requests table
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id uuid DEFAULT auth.gen_random_uuid() PRIMARY KEY,
  author_name text NOT NULL,
  email text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_approved boolean DEFAULT false NOT NULL,
  is_public boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_page_content_slug ON public.page_content(page_slug);
CREATE INDEX IF NOT EXISTS idx_activities_order ON public.activities("order");
CREATE INDEX IF NOT EXISTS idx_gallery_items_order ON public.gallery_items("order");
CREATE INDEX IF NOT EXISTS idx_prayer_requests_approved ON public.prayer_requests(is_approved);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_public ON public.prayer_requests(is_public);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_created ON public.prayer_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_content (read-only for users, write for admins)
CREATE POLICY "Anyone can read page_content"
  ON public.page_content FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can update page_content"
  ON public.page_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert page_content"
  ON public.page_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for activities
CREATE POLICY "Anyone can read activities"
  ON public.activities FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can manage activities"
  ON public.activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for gallery_items
CREATE POLICY "Anyone can read gallery_items"
  ON public.gallery_items FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can manage gallery_items"
  ON public.gallery_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for prayer_requests
CREATE POLICY "Authenticated users can read approved public prayer_requests"
  ON public.prayer_requests FOR SELECT
  TO authenticated, anon
  USING (is_approved AND is_public);

CREATE POLICY "Only admins can view all prayer_requests"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Anyone can insert prayer_requests"
  ON public.prayer_requests FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Only admins can manage prayer_requests"
  ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete prayer_requests"
  ON public.prayer_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
