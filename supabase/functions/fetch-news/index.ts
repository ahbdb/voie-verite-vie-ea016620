import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RssSource { name: string; url: string }

// Sources RSS catholiques francophones
const RSS_SOURCES: RssSource[] = [
  { name: 'Aleteia',           url: 'https://fr.aleteia.org/feed/' },
  { name: 'Vatican News',      url: 'https://www.vaticannews.va/fr.rss.xml' },
  { name: 'La Croix',          url: 'https://www.la-croix.com/RSS/UNIVERS-RELIGION' },
  { name: 'Famille Chrétienne',url: 'https://www.famillechretienne.fr/feed/' },
  { name: 'iMédia',            url: 'https://www.imedias.eu/feed/' },
  { name: 'KTO',               url: 'https://www.ktotv.com/rss.xml' },
]

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

  // Récupérer les URLs déjà connues pour éviter les doublons
  const { data: existing } = await supabase
    .from('news_posts')
    .select('external_url')
    .not('external_url', 'is', null)
    .limit(2000)
  const knownUrls = new Set((existing ?? []).map((r: any) => r.external_url as string))

  let totalInserted = 0
  const errors: string[] = []

  for (const src of RSS_SOURCES) {
    try {
      const res = await fetch(src.url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoieVeriteVie/1.0)' },
      })
      if (!res.ok) { errors.push(`${src.name}: HTTP ${res.status}`); continue }

      const xml = await res.text()
      const items = parseItems(xml)

      const rows = items
        .filter(i => !knownUrls.has(i.link))
        .slice(0, 8)
        .map(i => ({
          title:        i.title.slice(0, 255),
          excerpt:      i.excerpt || null,
          content:      null,
          image_url:    i.image || null,
          external_url: i.link,
          category:     'church',
          author_name:  src.name,
          is_published: true,
          featured:     false,
          published_at: i.pubDate ? new Date(i.pubDate).toISOString() : new Date().toISOString(),
        }))

      if (rows.length > 0) {
        const { error } = await supabase.from('news_posts').insert(rows)
        if (error) errors.push(`${src.name}: ${error.message}`)
        else { totalInserted += rows.length; rows.forEach(r => knownUrls.add(r.external_url)) }
      }
    } catch (e) {
      errors.push(`${src.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Nettoyage : supprimer les articles 'church' de plus de 30 jours
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  await supabase
    .from('news_posts')
    .delete()
    .eq('category', 'church')
    .lt('published_at', cutoff)

  return new Response(
    JSON.stringify({ success: true, inserted: totalInserted, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
