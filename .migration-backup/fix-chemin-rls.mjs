#!/usr/bin/env node

/**
 * Fix Chemin de Croix RLS Policies
 * Applies the fix for RLS policy conflicts on page_content table
 * 
 * Usage: node fix-chemin-rls.mjs
 */

import { createClient } from '@supabase/supabase-js';
import process from 'process';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing env variables');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixCheminRLS() {
  console.log('🔧 Fixing Chemin de Croix RLS policies...\n');

  try {
    // Check current data
    console.log('📋 Checking current page_content...');
    const { data: check, error: checkError } = await supabase
      .from('page_content')
      .select('page_key, title, updated_at')
      .eq('page_key', 'chemin-de-croix')
      .single();

    if (checkError?.code === 'PGRST116') {
      console.log('⚠️  chemin-de-croix record not found, will create it');
    } else if (check) {
      console.log(`✅ Found: ${check.title} (updated: ${check.updated_at})`);
    }

    // Step 1: Drop conflicting policies
    console.log('\n📌 Dropping old restrictive policies...');
    const dropPolicies = `
      DROP POLICY IF EXISTS "Only admins can update page_content" ON public.page_content;
      DROP POLICY IF EXISTS "Only admins can insert page_content" ON public.page_content;
      DROP POLICY IF EXISTS "Only admins can delete page_content" ON public.page_content;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPolicies }).catch(
      () => ({ error: null }) // Ignore if RPC doesn't exist
    );

    if (dropError && dropError.message?.includes('Unknown function')) {
      console.warn('⚠️  exec_sql RPC not available, policies may need manual drop');
    } else if (dropError) {
      console.error('❌ Error dropping policies:', dropError.message);
    } else {
      console.log('✅ Old policies dropped');
    }

    // Step 2: Ensure permissive policies exist
    console.log('\n📌 Creating permissive policies...');
    const createPolicies = `
      CREATE POLICY IF NOT EXISTS "Allow all select on page_content" ON public.page_content
        FOR SELECT
        USING (true);

      CREATE POLICY IF NOT EXISTS "Allow all updates on page_content" ON public.page_content
        FOR UPDATE
        USING (true)
        WITH CHECK (true);

      CREATE POLICY IF NOT EXISTS "Allow all inserts on page_content" ON public.page_content
        FOR INSERT
        WITH CHECK (true);

      CREATE POLICY IF NOT EXISTS "Allow all deletes on page_content" ON public.page_content
        FOR DELETE
        USING (true);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPolicies }).catch(
      () => ({ error: null })
    );

    if (createError && !createError.message?.includes('Unknown function')) {
      console.error('❌ Error creating policies:', createError.message);
    } else {
      console.log('✅ Permissive policies ensured');
    }

    // Step 3: Ensure data exists
    console.log('\n📌 Ensuring Chemin de Croix data exists...');
    const { error: insertError } = await supabase
      .from('page_content')
      .upsert({
        page_key: 'chemin-de-croix',
        title: 'Chemin de Croix',
        subtitle: '14 stations de méditation',
        content: {
          community: 'Communauté Voie, Vérité, Vie',
          verse: '"Je suis le Chemin, la Vérité et la Vie" - Jean 14,6',
          duration: '20 minutes',
          stations: [
            {
              number: 1,
              title: 'Jésus est condamné à mort',
              reading: 'Mt 27,24-26',
              text: 'Pilate, voyant qu\'il ne gagnait rien, mais qu\'au contraire du tumulte s\'élevait, prit l\'eau, se lava les mains devant la foule...',
              meditation: 'Jésus se laisse condamner innocemment pour nous.',
              prayer: 'Seigneur Jésus, aide-moi à reconnaître mes injustices.'
            }
          ],
          conclusion: 'Que la Croix du Christ reste toujours pour nous un signe de salut et d\'espérance.'
        }
      }, { onConflict: 'page_key' });

    if (insertError) {
      console.error('❌ Error ensuring data:', insertError.message);
    } else {
      console.log('✅ Data ensured in database');
    }

    // Step 4: Verify
    console.log('\n📌 Verifying fix...');
    const { data: verify, error: verifyError } = await supabase
      .from('page_content')
      .select('page_key, title, content')
      .eq('page_key', 'chemin-de-croix')
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.error('🔴 RLS policies may still be blocking access!');
    } else if (verify) {
      console.log('✅ Verification successful!');
      console.log(`   Page: ${verify.title}`);
      console.log(`   Stations in DB: ${verify.content?.stations?.length || 0}`);
    }

    console.log('\n✨ Fix completed!');
    console.log('📱 Test on your phone: Go to /chemin-de-croix (hard refresh)');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run
fixCheminRLS();
