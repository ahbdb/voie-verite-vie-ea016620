-- Create prayer_requests table for Prayer Forum
CREATE TABLE public.prayer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  prayer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Policies for prayer_requests
CREATE POLICY "Anyone can view prayer requests" 
ON public.prayer_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create prayer requests" 
ON public.prayer_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR is_anonymous = true);

CREATE POLICY "Users can update their own prayer requests" 
ON public.prayer_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prayer requests" 
ON public.prayer_requests 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all prayer requests" 
ON public.prayer_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create prayer_responses table
CREATE TABLE public.prayer_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_request_id UUID REFERENCES public.prayer_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prayer responses" 
ON public.prayer_responses 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create responses" 
ON public.prayer_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reading_id UUID REFERENCES public.biblical_readings(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'open_ended')),
  options JSONB,
  correct_answer TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('simple', 'medium', 'complex')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quizzes" 
ON public.quizzes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage quizzes" 
ON public.quizzes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create user_quiz_responses table
CREATE TABLE public.user_quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

ALTER TABLE public.user_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own responses" 
ON public.user_quiz_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own responses" 
ON public.user_quiz_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create activity_registrations table
CREATE TABLE public.activity_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_name TEXT NOT NULL,
  phone_country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own registrations" 
ON public.activity_registrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create registrations" 
ON public.activity_registrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all registrations" 
ON public.activity_registrations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create donations table
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'XAF',
  donor_name TEXT,
  donor_email TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own donations" 
ON public.donations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create donations" 
ON public.donations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all donations" 
ON public.donations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Add phone fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;