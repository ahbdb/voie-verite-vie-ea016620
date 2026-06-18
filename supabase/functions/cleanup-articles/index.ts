import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Cron quotidien (02:00 UTC) — applique les 3 règles d'auto-suppression :
 *
 *  1. RSS absents du flux depuis >7j  → DELETE rss_articles
 *  2. Lien externe cassé (404/410) 3× → DELETE rss_articles + UNPUBLISH news_posts
 *  3. Articles >90j non-featured       → DELETE rss_articles + UNPUBLISH news_posts
 *
 *  Les articles éditoriaux (news_posts) ne sont JAMAIS supprimés physiquement ;
 *  ils sont seulement dépubliés pour préserver l'historique admin.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const stats = {
    rss_disappeared: 0,
    rss_broken: 0,
    rss_old: 0,
    news_broken_unpublished: 0,
    news_old_unpublished: 0,
    errors: [] as string[],
  }

  const now = Date.now()
  const d7  = new Date(now - 7  * 86_400_000).toISOString()
  const d90 = new Date(now - 90 * 86_400_000).toISOString()
  const d1  = new Date(now - 1  * 86_400_000).toISOString()

  // ── RÈGLE 1 : articles RSS absents du flux depuis >7j ───────────────────────
  try {
    const { data, error } = await supabase
      .from('rss_articles')
      .delete()
      .lt('last_seen_at', d7)
      .select('id')
    if (error) stats.errors.push(`rule1: ${error.message}`)
    else stats.rss_disappeared = data?.length ?? 0
  } catch (e) { stats.errors.push(`rule1: ${String(e)}`) }

  // ── RÈGLE 2 : vérifier les liens externes (HEAD) ─────────────────────────────
  try {
    // On vérifie 50 articles non-vérifiés depuis 24h pour limiter le quota
    const { data: toCheck } = await supabase
      .from('rss_articles')
      .select('id, external_url, broken_check_count')
      .lt('updated_at', d1)
      .eq('is_broken', false)
      .limit(50)

    for (const row of toCheck ?? []) {
      try {
        const res = await fetch(row.external_url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoieVeriteVie-Cleanup/1.0)' },
        })
        if (res.status === 404 || res.status === 410) {
          const next = (row.broken_check_count ?? 0) + 1
          if (next >= 3) {
            // 3 échecs consécutifs → suppression RSS + dépublication news
            await supabase.from('rss_articles').delete().eq('id', row.id)
            await supabase.from('news_posts').update({ is_published: false }).eq('external_url', row.external_url)
            stats.rss_broken++
            stats.news_broken_unpublished++
          } else {
            await supabase.from('rss_articles').update({ broken_check_count: next }).eq('id', row.id)
          }
        } else if (res.ok) {
          // Reset compteur si l'URL est de nouveau vivante
          if ((row.broken_check_count ?? 0) > 0) {
            await supabase.from('rss_articles').update({ broken_check_count: 0 }).eq('id', row.id)
          }
        }
      } catch {
        // timeout/réseau : on incrémente quand même prudemment
        const next = (row.broken_check_count ?? 0) + 1
        await supabase.from('rss_articles').update({ broken_check_count: next }).eq('id', row.id)
      }
    }
  } catch (e) { stats.errors.push(`rule2: ${String(e)}`) }

  // ── RÈGLE 3 : articles trop anciens (>90j) ──────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('rss_articles')
      .delete()
      .lt('published_at', d90)
      .select('id')
    if (error) stats.errors.push(`rule3-rss: ${error.message}`)
    else stats.rss_old = data?.length ?? 0
  } catch (e) { stats.errors.push(`rule3-rss: ${String(e)}`) }

  try {
    const { data, error } = await supabase
      .from('news_posts')
      .update({ is_published: false })
      .lt('published_at', d90)
      .eq('featured', false)
      .eq('is_published', true)
      .select('id')
    if (error) stats.errors.push(`rule3-news: ${error.message}`)
    else stats.news_old_unpublished = data?.length ?? 0
  } catch (e) { stats.errors.push(`rule3-news: ${String(e)}`) }

  return new Response(
    JSON.stringify({ success: true, ...stats }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})