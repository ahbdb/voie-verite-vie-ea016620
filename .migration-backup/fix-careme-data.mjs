#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!anonKey) {
  console.error('❌ VITE_SUPABASE_PUBLISHABLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, anonKey)

// All 40 days of Careme 2026
const allDays = [
  { date: 'Mercredi 18 février', title: 'Mercredi des Cendres', readings: 'Jl 2,12-18 / Ps 50 / 2 Co 5,20-6,2 / Mt 6,1-6.16-18', actions: { soi: 'Faire un examen de conscience approfondi', prochain: "Demander pardon à une personne que j'ai blessée", dieu: 'Participer à la messe et recevoir les cendres, faire un acte de contrition' }, weekTitle: 'Semaine 1 de Carême' },
  { date: 'Jeudi 19 février', title: '', readings: 'Dt 30,15-20 / Ps 1 / Lc 9,22-25', actions: { soi: 'Écrire mes 3 résolutions définitives dans un carnet', prochain: "Appeler un proche que j'ai négligé depuis longtemps", dieu: 'Méditer 15 minutes sur le choix entre la vie et la mort' }, weekTitle: 'Semaine 1 de Carême' },
  { date: 'Vendredi 20 février', title: '', readings: 'Is 58,1-9a / Ps 50 / Mt 9,14-15', actions: { soi: 'Ne publier aucun contenu négatif sur les réseaux sociaux aujourd\'hui', prochain: 'Faire une œuvre de miséricorde corporelle', dieu: 'Chemin de Croix complet' }, weekTitle: 'Semaine 1 de Carême' },
  { date: 'Samedi 21 février', title: '', readings: 'Is 58,9b-14 / Ps 85 / Lc 5,27-32', actions: { soi: 'Lire l\'Évangile du jour et noter un enseignement', prochain: "Inviter quelqu'un d'éloigné de Dieu à prier avec moi", dieu: 'Prier pour ma conversion et celle des pécheurs' }, weekTitle: 'Semaine 1 de Carême' },
  { date: 'Dimanche 22 février', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Reposer mon corps et mon esprit', prochain: 'Partager un repas festif avec ma famille', dieu: 'Assister à la messe et célébrer la Résurrection du Christ' }, weekTitle: 'Semaine 1 de Carême' },
]

async function fixCaremeData() {
  console.log('🔧 Fixing Careme 2026 data...\n')
  
  try {
    console.log(`📊 Total days to save: ${allDays.length}`)
    
    // Show Friday Feb 20
    const fridayDay = allDays.find(d => d.date.includes('20'))
    if (fridayDay) {
      console.log('\n📅 Friday Feb 20 (to be saved):')
      console.log(JSON.stringify(fridayDay, null, 2))
    }

    // Check what's in DB
    const { data: dbData, error: dbError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'careme-2026')
      .single()
    
    if (dbError) {
      console.error('❌ DB Error:', dbError)
      return
    }

    console.log('\n📦 Current DB Data:')
    console.log(`  Days in DB: ${dbData.content?.days?.length || 0}`)
    const currentFriday = dbData.content?.days?.find(d => d.date.includes('20'))
    if (currentFriday) {
      console.log('  Friday Feb 20 in DB (BEFORE update):')
      console.log(JSON.stringify(currentFriday, null, 2))
    }

    // Now update DB with full data
    console.log('\n💾 Updating DB with full careme data...')
    const updateData = {
      title: 'Carême 2026',
      subtitle: '40 jours de prière, pénitence et partage',
      content: {
        days: allDays
      }
    }

    const { error: updateError, data: updateResult } = await supabase
      .from('page_content')
      .update(updateData)
      .eq('page_key', 'careme-2026')
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Update Error:', updateError)
      return
    }

    console.log('✅ Update successful!')
    console.log(`   Days in DB after update: ${updateResult.content?.days?.length}`)

    // Verify the update
    const { data: verifyData } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'careme-2026')
      .single()
    
    console.log('\n✅ Verification (AFTER update):')
    console.log(`   Days in DB: ${verifyData.content?.days?.length}`)
    
    const verifyFriday = verifyData.content?.days?.find(d => d.date.includes('20'))
    if (verifyFriday) {
      console.log('   Friday Feb 20 actions (AFTER update):')
      console.log(JSON.stringify(verifyFriday.actions, null, 2))
    }

  } catch (err) {
    console.error('❌ Exception:', err.message)
  }
}

fixCaremeData()
