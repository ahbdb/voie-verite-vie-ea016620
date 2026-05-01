#!/usr/bin/env node
/**
 * Check current state in database
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, anonKey)

async function check() {
  // Get careme-2026
  const { data: careme } = await supabase
    .from('page_content')
    .select('content')
    .eq('page_key', 'careme-2026')
    .single()
  
  if (careme?.content?.days?.length) {
    const friday = careme.content.days.find(d => d.date === 'Vendredi 20 février')
    console.log('📊 Current state in database:')
    console.log('  Total days:', careme.content.days.length)
    console.log('  Friday Feb 20 prochain:', friday?.actions.prochain)
  } else {
    console.log('⚠️  No days in database!')
  }
}

check()
