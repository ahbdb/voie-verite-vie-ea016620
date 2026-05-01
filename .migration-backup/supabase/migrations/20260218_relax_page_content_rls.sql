-- Create RPC to safely update page_content from the app
-- Users must be authenticated and admin role is verified at app level

CREATE OR REPLACE FUNCTION update_page_content_data(
  p_page_key text,
  p_content jsonb
)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- Update the content
  UPDATE public.page_content 
  SET 
    content = p_content,
    updated_at = now()
  WHERE page_key = p_page_key;
  
  -- Return the updated record
  SELECT json_build_object(
    'success', true,
    'page_key', page_key,
    'content', content,
    'updated_at', updated_at
  )
  INTO v_result
  FROM public.page_content
  WHERE page_key = p_page_key;
  
  RETURN COALESCE(v_result, json_build_object('success', false, 'error', 'Not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users only
GRANT EXECUTE ON FUNCTION update_page_content_data(text, jsonb) TO authenticated;

-- Keep RLS as is - READ is public, WRITE requires function call

