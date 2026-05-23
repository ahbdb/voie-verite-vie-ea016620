#!/usr/bin/env node
/**
 * Diagnostic script to check why admin saves aren't appearing in user pages
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

console.log('\n🔍 DIAGNOSTIC: Admin Save → User Display Issue\n')
console.log('═'.repeat(60))

if (!anonKey) {
  console.error('❌ VITE_SUPABASE_PUBLISHABLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, anonKey)

async function diagnose() {
  try {
    // Check 1: Does page_content table exist?
    console.log('\n✓ Check 1: Does page_content table exist?')
    const { data: tables, error: tableError } = await supabase
      .from('page_content')
      .select('*', { count: 'exact', head: true })
      .limit(1)

    if (tableError && tableError.code === 'PGRST116') {
      console.log('  ❌ Table does not exist!')
      console.log('     Error:', tableError.message)
      return
    }

    console.log('  ✅ Table exists')

    // Check 2: Does careme-2026 record exist?
    console.log('\n✓ Check 2: Does careme-2026 record exist?')
    const { data: careme, error: caremeError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'careme-2026')
      .single()

    if (caremeError) {
      console.log('  ⚠️  No careme-2026 record found')
      console.log('     Creating test record...')
      
      const { error: insertError } = await supabase
        .from('page_content')
        .insert({
          page_key: 'careme-2026',
          title: 'Carême 2026',
          subtitle: 'Test',
          content: { days: [] }
        })
      
      if (insertError) {
        console.log('  ❌ Could not create record:', insertError.message)
        return
      }
      console.log('  ✅ Test record created')
    } else {
      console.log('  ✅ Record exists')
      console.log('     Days in DB:', careme?.content?.days?.length || 0)
    }

    // Check 3: Can we do a direct UPDATE?
    console.log('\n✓ Check 3: Can we do a direct UPDATE?')
    const testData = {
      test_update: new Date().toISOString(),
      message: 'Diagnostic test'
    }
    
    const { error: updateError } = await supabase
      .from('page_content')
      .update({
        content: testData,
        updated_at: new Date().toISOString()
      })
      .eq('page_key', 'careme-2026')

    if (updateError) {
      console.log('  ❌ UPDATE failed!')
      console.log('     Error:', updateError.message)
      console.log('     This means your RLS policy might be blocking direct updates')
      console.log('     Solution: Allow UPDATE for authenticated users or anon users')
    } else {
      console.log('  ✅ Direct UPDATE works')
    }

    // Check 4: Does RPC function exist?
    console.log('\n✓ Check 4: Does RPC function update_page_content_data exist?')
    const { error: rpcError } = await supabase.rpc('update_page_content_data', {
      p_page_key: 'careme-2026',
      p_content: { test: true }
    })

    if (rpcError && rpcError.message?.includes('does not exist')) {
      console.log('  ❌ RPC function does NOT exist')
      console.log('     This is expected if you haven\'t run the SQL migration')
      console.log('     The code will fallback to direct UPDATE (which should work)')
    } else if (rpcError) {
      console.log('  ⚠️  RPC call failed:', rpcError.message)
    } else {
      console.log('  ✅ RPC function exists and can be called')
    }

    // Check 5: Verify data was saved
    console.log('\n✓ Check 5: Verify latest data in database')
    const { data: latest } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'careme-2026')
      .single()

    if (latest?.content?.test_update) {
      console.log('  ✅ Test UPDATE was saved to database')
      console.log('     Timestamp:', latest.content.test_update)
    } else if (latest?.content?.message === 'Diagnostic test') {
      console.log('  ✅ Test data found in database')
    } else {
      console.log('  ⚠️  Test data not found')
      console.log('     Current content keys:', Object.keys(latest?.content || {}))
    }

    // Final verdict
    console.log('\n' + '═'.repeat(60))
    console.log('\n📋 DIAGNOSIS SUMMARY:\n')
    
    if (careme && !caremeError) {
      if (latest?.content?.test_update || latest?.content?.message === 'Diagnostic test') {
        console.log('✅ SYSTEM IS WORKING!')
        console.log('   The database can save and retrieve data.')
        console.log('   The issue might be:')
        console.log('   • Admin page not waiting for data to be saved')
        console.log('   • User page not subscribed to real-time updates')
        console.log('   • Browser cache showing old data')
        console.log('\n   Solution: ')
        console.log('   1. Check browser console (F12) for errors')
        console.log('   2. Hard refresh user page (Ctrl+Shift+R or Cmd+Shift+R)')
        console.log('   3. Check that real-time subscription is active')
      } else {
        console.log('⚠️  PARTIAL ISSUE')
        console.log('   Database table exists but data isn\'t persisting')
        console.log('   Check your RLS policies')
      }
    } else {
      console.log('❌ CRITICAL ISSUE')
      console.log('   page_content table doesn\'t exist or is inaccessible')
      console.log('   Need to create table first')
      console.log('\n   Solution: Run migrations from Session 6')
      console.log('   See: supabase/migrations/20260218_fix_page_content.sql')
    }

    console.log('\n' + '═'.repeat(60) + '\n')

  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message)
  }
}

diagnose()
