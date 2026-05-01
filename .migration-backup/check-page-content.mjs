import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkPageContent() {
  console.log('📊 Checking page_content table structure and data...\n')
  
  // Check if table exists by trying to query it
  const { data, error, status } = await supabase
    .from('page_content')
    .select('*')
  
  if (error) {
    console.error('❌ Error querying page_content table:')
    console.error(`   Status: ${status}`)
    console.error(`   Error: ${error.message}`)
    return
  }
  
  console.log(`✅ page_content table found with ${data.length} entries:\n`)
  
  data.forEach((entry, idx) => {
    console.log(`Entry ${idx + 1}:`)
    console.log(`  page_key: ${entry.page_key}`)
    console.log(`  title: ${entry.title}`)
    console.log(`  subtitle: ${entry.subtitle}`)
    
    if (entry.content && typeof entry.content === 'object') {
      if (entry.content.days) {
        console.log(`  content.days: ${Array.isArray(entry.content.days) ? entry.content.days.length + ' days' : 'not an array'}`)
      }
      if (entry.content.stations) {
        console.log(`  content.stations: ${Array.isArray(entry.content.stations) ? entry.content.stations.length + ' stations' : 'not an array'}`)
      }
    }
    
    console.log(`  created_at: ${entry.created_at}`)
    console.log(`  updated_at: ${entry.updated_at}\n`)
  })
}

checkPageContent()
