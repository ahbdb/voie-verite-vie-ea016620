-- Create user_program_progress table to store per-user completion of program days
CREATE TABLE public.user_program_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_key TEXT NOT NULL,
  date DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_key, date)
);

-- Enable Row Level Security
ALTER TABLE public.user_program_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own program progress" 
  ON public.user_program_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own program progress" 
  ON public.user_program_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own program progress" 
  ON public.user_program_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own program progress" 
  ON public.user_program_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all program progress" 
  ON public.user_program_progress FOR ALL
  USING (has_role(auth.uid(), 'admin'));
