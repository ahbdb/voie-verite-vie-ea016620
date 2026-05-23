-- Fix conflicting RLS policies on page_content
-- Drop the overly restrictive policy from 20251210_add_content_management_tables.sql
-- This will allow the more permissive policies from 20260218_fix_page_content.sql to work

-- First, let's drop the old restrictive policies
DROP POLICY IF EXISTS "Only admins can update page_content" ON public.page_content;
DROP POLICY IF EXISTS "Only admins can insert page_content" ON public.page_content;
DROP POLICY IF EXISTS "Only admins can delete page_content" ON public.page_content;

-- Now recreate the permissive policies that allow everyone to write
-- (App-level admin role check will be done on the frontend)
CREATE POLICY "Allow all updates on page_content" ON public.page_content
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all inserts on page_content" ON public.page_content
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all deletes on page_content" ON public.page_content
  FOR DELETE
  USING (true);

-- Verify the policy exists for SELECT (should already exist)
-- If not, create it:
CREATE POLICY IF NOT EXISTS "Allow all select on page_content" ON public.page_content
  FOR SELECT
  USING (true);
