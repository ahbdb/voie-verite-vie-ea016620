#!/usr/bin/env node
/**
 * Test exactly what loadContent() does
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, anonKey)

async function testLoadContent() {
  console.log('🔄 Testing loadContent() logic...\n')
  
  try {
    console.log('Executing: supabase.from(page_content).select(*).eq(page_key, careme-2026).single()')
    
    const { data, error } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'careme-2026')
      .single()
    
    console.log('\nResult:')
    console.log('  error:', error)
    console.log('  data:', data ? { ...data, content: `{...${JSON.stringify(data.content).substring(0, 100)}}` } : null)
    
    if (error) {
      console.error('❌ Query failed with error')
      return
    }
    
    if (data?.content) {
      console.log('\n✅ data.content exists')
      console.log('  Days count:', data.content.days?.length)
      
      if (data.content.days) {
        const friday = data.content.days.find(d => d.date === 'Vendredi 20 février')
        console.log('  Friday 20 prochain:', friday?.actions.prochain)
        console.log('\n🎯 This is what should appear to users!')
      }
    } else {
      console.log('⚠️  data exists but no content')
    }
    
  } catch (err) {
    console.error('❌ Exception:', err.message)
  }
}

testLoadContent()
