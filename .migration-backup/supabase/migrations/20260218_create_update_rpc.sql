-- RPC to update page_content, bypassing RLS with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_page_content_direct(
  p_page_key text,
  p_content jsonb
)
RETURNS TABLE(id uuid, page_key text, title text, subtitle text, content jsonb, created_at timestamp with time zone, updated_at timestamp with time zone) 
AS $$
BEGIN
  -- Update the page content
  UPDATE public.page_content 
  SET
    content = p_content,
    updated_at = now()
  WHERE page_content.page_key = p_page_key;
  
  -- Return the updated row
  RETURN QUERY
  SELECT 
    public.page_content.id,
    public.page_content.page_key,
    public.page_content.title,
    public.page_content.subtitle,
    public.page_content.content,
    public.page_content.created_at,
    public.page_content.updated_at
  FROM public.page_content
  WHERE public.page_content.page_key = p_page_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to all users
GRANT EXECUTE ON FUNCTION update_page_content_direct(text, jsonb) TO authenticated, anon;

