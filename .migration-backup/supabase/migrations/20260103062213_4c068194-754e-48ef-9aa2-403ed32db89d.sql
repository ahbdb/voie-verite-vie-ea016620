-- Table pour les questions FAQ
CREATE TABLE public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les images de la galerie
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les activités dynamiques
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 50,
  price TEXT DEFAULT 'Gratuit',
  image_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour le contenu des pages (accueil, à propos, etc.)
CREATE TABLE public.page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  content JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

-- Politiques pour FAQ
CREATE POLICY "Anyone can view published FAQ" ON public.faq_items FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage FAQ" ON public.faq_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Politiques pour Galerie
CREATE POLICY "Anyone can view published gallery images" ON public.gallery_images FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage gallery" ON public.gallery_images FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Politiques pour Activités
CREATE POLICY "Anyone can view published activities" ON public.activities FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage activities" ON public.activities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Politiques pour contenu des pages
CREATE POLICY "Anyone can view page content" ON public.page_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage page content" ON public.page_content FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insérer le contenu par défaut des pages
INSERT INTO public.page_content (page_key, title, subtitle, content) VALUES 
('home', 'Voie, Vérité, Vie', 'Votre guide spirituel quotidien', '{"hero_text": "Je suis le chemin, la vérité et la vie", "mission_text": "Accompagner chaque âme dans son cheminement spirituel"}'),
('about', 'À Propos', 'Notre histoire et notre mission', '{"founder": "AHOUFACK Dylanne Baudouin", "vision": "Une communauté unie dans la foi"}');

-- Insérer quelques FAQ par défaut
INSERT INTO public.faq_items (question, answer, category, sort_order) VALUES
('Comment participer aux lectures bibliques ?', 'Rendez-vous sur la page Lecture Biblique pour découvrir le programme de lecture quotidien. Vous pouvez suivre votre progression en vous connectant.', 'general', 1),
('Comment soumettre une demande de prière ?', 'Allez sur le Forum Prière et cliquez sur "Nouvelle demande". Vous pouvez choisir de publier anonymement.', 'general', 2),
('Comment contacter l''équipe ?', 'Utilisez le formulaire de la page Contact ou envoyez un email à contact@voieveritevie.org.', 'contact', 3);

-- Créer un bucket storage pour les images de la galerie
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT DO NOTHING;

-- Politique storage pour la galerie
CREATE POLICY "Anyone can view gallery images" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Admins can upload gallery images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete gallery images" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));