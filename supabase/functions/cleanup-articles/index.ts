import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Cron toutes les 30 min — politique aggressive :
 *  1. RSS non-vus dans un flux depuis >24h        → DELETE
 *  2. Lien 404 / 410                              → DELETE (immédiat)
 *  3. RSS > 2j SI ≥15 récents dans (cat, pays)    → DELETE (rotation)
 *  4. news_posts > 90j non-featured               → UNPUBLISH
 *
 *  news_posts n'est jamais supprimé physiquement (historique admin préservé).
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
    rss_rotated: 0,
    news_broken_unpublished: 0,
    news_old_unpublished: 0,
    errors: [] as string[],
  }

  const now = Date.now()
  const d1 = new Date(now - 1  * 86_400_000).toISOString()
  const d2 = new Date(now - 2  * 86_400_000).toISOString()
  const d90 = new Date(now - 90 * 86_400_000).toISOString()

  // ── RÈGLE 1 : disparus du flux depuis >24h ───────────────────────────────────
  try {
    const { data, error } = await supabase.from('rss_articles').delete().lt('last_seen_at', d1).select('id')
    if (error) stats.errors.push(`rule1: ${error.message}`)
    else stats.rss_disappeared = data?.length ?? 0
  } catch (e) { stats.errors.push(`rule1: ${String(e)}`) }

  // ── RÈGLE 2 : liens externes cassés (HEAD) ───────────────────────────────────
  try {
    const { data: toCheck } = await supabase
      .from('rss_articles')
      .select('id, external_url')
      .lt('updated_at', d1)
      .eq('is_broken', false)
      .limit(80)

    for (const row of toCheck ?? []) {
      try {
        const res = await fetch(row.external_url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoieVeriteVie-Cleanup/1.0)' },
        })
        if (res.status === 404 || res.status === 410) {
          await supabase.from('rss_articles').delete().eq('id', row.id)
          await supabase.from('news_posts').update({ is_published: false }).eq('external_url', row.external_url)
          stats.rss_broken++
          stats.news_broken_unpublished++
        }
      } catch { /* timeout : on ignore, sera retenté au prochain run */ }
    }
  } catch (e) { stats.errors.push(`rule2: ${String(e)}`) }

  // ── RÈGLE 3 : rotation — vieux articles supprimés si assez de récents ───────
  try {
    const { data: olds } = await supabase
      .from('rss_articles')
      .select('id, category, country')
      .lt('published_at', d2)

    const buckets = new Map<string, string[]>()
    for (const o of olds ?? []) {
      const key = `${o.category}::${o.country ?? 'null'}`
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(o.id)
    }
    for (const [key, ids] of buckets) {
      const [cat, country] = key.split('::')
      let q = supabase.from('rss_articles').select('id', { count: 'exact', head: true })
        .gte('published_at', d2).eq('category', cat)
      q = country === 'null' ? q.is('country', null) : q.eq('country', country)
      const { count } = await q
      if ((count ?? 0) >= 15) {
        const { data } = await supabase.from('rss_articles').delete().in('id', ids).select('id')
        stats.rss_rotated += data?.length ?? 0
      }
    }
  } catch (e) { stats.errors.push(`rule3: ${String(e)}`) }

  // ── RÈGLE 4 : news_posts anciens dépubliés ──────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('news_posts')
      .update({ is_published: false })
      .lt('published_at', d90)
      .eq('featured', false)
      .eq('is_published', true)
      .select('id')
    if (error) stats.errors.push(`rule4: ${error.message}`)
    else stats.news_old_unpublished = data?.length ?? 0
  } catch (e) { stats.errors.push(`rule4: ${String(e)}`) }

  return new Response(
    JSON.stringify({ success: true, ...stats }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})