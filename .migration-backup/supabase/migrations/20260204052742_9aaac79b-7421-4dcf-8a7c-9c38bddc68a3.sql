-- Add new columns for activity date range and time range
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS start_time TEXT,
ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Copy existing data to new columns
UPDATE public.activities SET 
  start_date = date::date,
  start_time = time
WHERE start_date IS NULL;

-- Make start_date required (NOT NULL) after data migration
-- Note: we'll handle this in code since we have existing data

-- Add gallery_group column to group related images
ALTER TABLE public.gallery_images
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Create index for gallery grouping
CREATE INDEX IF NOT EXISTS idx_gallery_images_group_name ON public.gallery_images(group_name);