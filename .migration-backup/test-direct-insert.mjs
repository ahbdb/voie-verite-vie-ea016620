#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, anonKey)

// Minimal test - just 5 days to see if it works
const testDays = [
  { date: 'Vendredi 20 février', title: '', readings: 'Is 58,1-9a / Ps 50 / Mt 9,14-15', actions: { soi: "Ne publier aucun contenu négatif sur les réseaux sociaux aujourd'hui", prochain: "Faire une œuvre de miséricorde corporelle", dieu: "Chemin de Croix complet" }, weekTitle: 'Semaine 1 de Carême' },
]

async function testDirectInsert() {
  console.log('🔨 Direct SQL test approach...\n')
  
  try {
    // First check if record exists
    console.log('1️⃣ Checking if record exists...')
    const { data: existing } = await supabase
      .from('page_content')
      .select('id')
      .eq('page_key', 'careme-2026')
      .single()
    
    console.log('   Found record with id:', existing?.id)
    
    //Try truncating the days array first and see if that works
    console.log('\n2️⃣ Trying to update with empty array...')
    const { error: emptyError } = await supabase
      .from('page_content')
      .update({ content: { days: [] } })
      .eq('id', existing?.id)
    
    console.log('   Empty update error:', emptyError?.message || 'SUCCESS')
    
    // Now try with data
    console.log('\n3️⃣ Trying to update with test data...')
    const { error: testError, data: testData } = await supabase
      .from('page_content')
      .update({ content: { days: testDays } })
      .eq('id', existing?.id)
      .select()
    
    console.log('   Test update error:', testError?.message || 'SUCCESS')
    console.log('   Test update data:', testData)
    
    // Verify
    const { data: verify } = await supabase
      .from('page_content')
      .select('content')
      .eq('page_key', 'careme-2026')
      .single()
    
    console.log('\n✅ Final verification:')
    console.log('   Days in DB:', verify.content?.days?.length || 0)
    
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

testDirectInsert()
