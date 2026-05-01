#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!anonKey) {
  console.error('❌ VITE_SUPABASE_PUBLISHABLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, anonKey)

async function testPageContent() {
  console.log('🧪 Testing page_content table with public access...\n')
  
  try {
    const { data, error, status } = await supabase
      .from('page_content')
      .select('*')
    
    if (error) {
      console.error('❌ Error querying page_content table:')
      console.error(`   Status: ${status}`)
      console.error(`   Error: ${error.message}`)
      return
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  page_content table is empty. No data found.')
      return
    }
    
    console.log(`✅ Found ${data.length} entries in page_content:\n`)
    
    data.forEach((entry, idx) => {
      console.log(`Entry ${idx + 1}:`)
      console.log(`  └─ page_key: ${entry.page_key}`)
      console.log(`  └─ title: ${entry.title}`)
      console.log(`  └─ subtitle: ${entry.subtitle}`)
      
      if (entry.content && typeof entry.content === 'object') {
        const keys = Object.keys(entry.content)
        console.log(`  └─ content keys: ${keys.join(', ')}`)
        
        if (entry.content.days) {
          const daysCount = Array.isArray(entry.content.days) ? entry.content.days.length : 0
          console.log(`     └─ days: ${daysCount} item(s)`)
        }
        if (entry.content.stations) {
          const stationsCount = Array.isArray(entry.content.stations) ? entry.content.stations.length : 0
          console.log(`     └─ stations: ${stationsCount} item(s)`)
        }
      }
      
      console.log(`  └─ updated_at: ${new Date(entry.updated_at).toLocaleString('fr-FR')}\n`)
    })
    
    console.log('✅ All tests passed!')
  } catch (err) {
    console.error('❌ Exception:', err.message)
  }
}

testPageContent()
