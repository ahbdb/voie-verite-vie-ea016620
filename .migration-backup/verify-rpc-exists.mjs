#!/usr/bin/env node
/**
 * Ce script crée directement la RPC en utilisant une query SQL
 * avec le client Supabase en mode admin (si service role key disponible)
 */
import { createClient } from '@supabase/supabase-js'
import https from 'https'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!anonKey) {
  console.error('❌ VITE_SUPABASE_PUBLISHABLE_KEY not set')
  process.exit(1)
}

console.log('🔧 Attempting to create RPC function...\n')
console.log('📍 Using:', supabaseUrl)

// SQL to create the RPC
const createRpcSQL = `
CREATE OR REPLACE FUNCTION public.update_page_content_data(
  p_page_key text,
  p_content jsonb
)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  UPDATE public.page_content 
  SET 
    content = p_content,
    updated_at = now()
  WHERE page_key = p_page_key;
  
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

GRANT EXECUTE ON FUNCTION public.update_page_content_data(text, jsonb) TO authenticated, anon;
`.trim()

/**
 * Try fetching via REST API to execute SQL
 * This is a workaround since we can't directly execute SQL with anon key
 */
async function tryViaSQLEditor() {
  console.log('Trying via REST API...\n')
  
  // Create a user-callable function that will create the RPC
  const setupFunction = `
    CREATE OR REPLACE FUNCTION setup_update_page_content_rpc()
    RETURNS json AS $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_page_content_data' 
          AND proowner = (SELECT usesysid FROM pg_user WHERE usename = 'postgres')
      ) THEN
        EXECUTE $sql$
          CREATE FUNCTION public.update_page_content_data(
            p_page_key text,
            p_content jsonb
          )
          RETURNS json AS $inner$
          DECLARE
            v_result json;
          BEGIN
            IF auth.uid() IS NULL THEN
              RAISE EXCEPTION 'Must be authenticated';
            END IF;
            
            UPDATE public.page_content 
            SET 
              content = p_content,
              updated_at = now()
            WHERE page_key = p_page_key;
            
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
          $inner$ LANGUAGE plpgsql SECURITY DEFINER;
          
          GRANT EXECUTE ON FUNCTION public.update_page_content_data(text, jsonb) TO authenticated, anon;
        $sql$;
      END IF;
      RETURN json_build_object('setup', 'complete');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    SELECT setup_update_page_content_rpc();
  `.trim()

  // Try to call it
  try {
    // We'll try using the REST API with the anon key
    // Unfortunately, this won't work without auth, so we need service role key
    
    if (serviceRoleKey) {
      console.log('✅ Using SERVICE ROLE KEY for initialization\n')
      
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
      })
      
      // Try to execute via Postgres directly
      const result = await fetch(`${supabaseUrl}/rest/v1/rpc/setup_update_page_content_rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        }
      })
      
      if (result.ok) {
        console.log('✅ RPC setup via service role succeeded!')
        return true
      }
    }
    
    return false
  } catch (err) {
    console.error('⚠️  Setup failed:', err.message)
    return false
  }
}

async function verifyAndSync() {
  try {
    // Use service role key if available, otherwise anon
    const key = serviceRoleKey || anonKey
    const supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false }
    })
    
    console.log('✅ Testing RPC function...\n')
    
    // Try to call the RPC to see if it exists
    const { data, error } = await supabase.rpc('update_page_content_data', {
      p_page_key: 'careme-2026',
      p_content: { test: true }
    })
    
    if (error) {
      console.log('❌ RPC does not exist yet:', error.message)
      console.log('\n💡 MANUAL SETUP REQUIRED:')
      console.log('1. Go to: https://app.supabase.com/')
      console.log('2. Open your project')
      console.log('3. Go to SQL Editor')
      console.log('4. Create new query and paste the SQL from RPC_SETUP_INSTRUCTIONS.md')
      console.log('5. Run the query')
      console.log('6. Then run this script again')
      return false
    }
    
    console.log('✅ RPC exists and is working!')
    return true
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    return false
  }
}

await verifyAndSync()
