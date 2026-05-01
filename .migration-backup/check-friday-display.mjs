#!/usr/bin/env node
/**
 * Verify what the app should display for Friday
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs'

const supabase = createClient(supabaseUrl, anonKey)

async function verify() {
  console.log('\n📱 Checking what users should see on /programs/careme-2026\n')
  
  const { data } = await supabase
    .from('page_content')
    .select('content')
    .eq('page_key', 'careme-2026')
    .single()
  
  if (data?.content?.days) {
    const friday = data.content.days.find(d => d.date === 'Vendredi 20 février')
    
    console.log('✅ Friday February 20, 2026')
    console.log('━'.repeat(60))
    console.log('Date:', friday.date)
    console.log('Title:', friday.title || '(no title)')
    console.log('Readings:', friday.readings)
    console.log('\n💭 Actions for today:')
    console.log('  Soi (Myself):', friday.actions.soi)
    console.log('  Prochain (Others):', friday.actions.prochain)  
    console.log('  Dieu (God):', friday.actions.dieu)
    console.log('━'.repeat(60))
    console.log('\n🎯 Expected display:')
    if (friday.actions.prochain === 'merci') {
      console.log('✅ "merci" - CORRECT! ✨')
    } else if (friday.actions.prochain === 'Partager mon repas avec un sans-abri') {
      console.log('❌ "Partager mon repas avec un sans-abri" - Still showing old data')
    } else {
      console.log('❓ ' + friday.actions.prochain)
    }
  } else {
    console.log('❌ No data in database!')
  }
  
  console.log()
}

verify()
