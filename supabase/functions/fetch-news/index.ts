import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RssSource { name: string; url: string }

// Sources RSS catholiques francophones — assignées par catégorie
const RSS_SOURCES: (RssSource & { category: string })[] = [
  { name: 'Aleteia',            url: 'https://fr.aleteia.org/feed/' },
  { name: 'Vatican News',       url: 'https://www.vaticannews.va/fr.rss.xml' },
  { name: 'La Croix',           url: 'https://www.la-croix.com/RSS/UNIVERS-RELIGION' },
  { name: 'Famille Chrétienne', url: 'https://www.famillechretienne.fr/feed/' },
  { name: 'iMédia',             url: 'https://www.imedias.eu/feed/' },
  { name: 'KTO',                url: 'https://www.ktotv.com/rss.xml' },
  { name: 'Zenit',              url: 'https://fr.zenit.org/feed/' },
  { name: 'Radio Vatican',      url: 'https://www.vaticannews.va/fr/podcast/rss-news-fr.xml' },
].map(s => ({ ...s, category: 'church' }))

// ── XML helpers (no external dependency) ──────────────────────────────────────

function extractCdata(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function extractTag(xml: string, tag: string): string {
  const cdata = extractCdata(xml, tag)
  if (cdata) return cdata
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  if (!m) return ''
  return m[1]
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#8217;/g, '’')
    .trim()
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function findImage(item: string, desc: string): string {
  return (
    extractAttr(item, 'enclosure', 'url') ||
    extractAttr(item, 'media:content', 'url') ||
    extractAttr(item, 'media:thumbnail', 'url') ||
    (desc.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
    ''
  )
}

function parseItems(xml: string) {
  return (xml.match(/<item>([\s\S]*?)<\/item>/gi) || []).map(raw => {
    const title = extractTag(raw, 'title')
    const link  = extractTag(raw, 'link') || extractAttr(raw, 'link', 'href')
    const desc  = extractTag(raw, 'description')
    const pubDate = extractTag(raw, 'pubDate') || extractTag(raw, 'published')
    const image = findImage(raw, desc)
    return { title, link, excerpt: stripHtml(desc).slice(0, 350), pubDate, image }
  }).filter(i => i.title && i.link)
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const now = new Date().toISOString()
  let totalUpserted = 0
  let totalSeen = 0
  const errors: string[] = []

  await Promise.allSettled(RSS_SOURCES.map(async (src) => {
    try {
      const res = await fetch(src.url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoieVeriteVie/1.0; +https://voieveritevie.com)' },
      })
      if (!res.ok) { errors.push(`${src.name}: HTTP ${res.status}`); return }

      const xml = await res.text()
      const items = parseItems(xml).slice(0, 15)
      if (items.length === 0) return

      const rows = items.map(i => ({
        source:        src.name,
        title:         i.title.slice(0, 500),
        excerpt:       i.excerpt || null,
        image_url:     i.image || null,
        external_url:  i.link,
        category:      src.category,
        author_name:   src.name,
        published_at:  i.pubDate ? new Date(i.pubDate).toISOString() : now,
        last_seen_at:  now,
        is_broken:     false,
        broken_check_count: 0,
      }))

      const { error } = await supabase
        .from('rss_articles')
        .upsert(rows, { onConflict: 'external_url', ignoreDuplicates: false })

      if (error) errors.push(`${src.name}: ${error.message}`)
      else { totalUpserted += rows.length; totalSeen += rows.length }
    } catch (e) {
      errors.push(`${src.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }))

  return new Response(
    JSON.stringify({ success: true, upserted: totalUpserted, seen: totalSeen, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
