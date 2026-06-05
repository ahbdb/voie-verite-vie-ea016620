-- Migration: Add identity fields to profiles
-- Adds first_name, last_name, gender, baptism_date, wedding_date, marital_status

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name      text,
  ADD COLUMN IF NOT EXISTS last_name       text,
  ADD COLUMN IF NOT EXISTS gender          text CHECK (gender IN ('homme', 'femme')),
  ADD COLUMN IF NOT EXISTS baptism_date    date,
  ADD COLUMN IF NOT EXISTS wedding_date    date,
  ADD COLUMN IF NOT EXISTS marital_status  text CHECK (marital_status IN ('celibataire', 'marie', 'veuf', 'consacre'));

-- Backfill first_name from full_name for existing users (take first word)
UPDATE public.profiles
SET first_name = split_part(full_name, ' ', 1)
WHERE first_name IS NULL AND full_name IS NOT NULL AND full_name != '';

-- Backfill last_name from full_name for existing users (everything after first space)
UPDATE public.profiles
SET last_name = NULLIF(TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name))), '')
WHERE last_name IS NULL AND full_name IS NOT NULL AND POSITION(' ' IN full_name) > 0;
