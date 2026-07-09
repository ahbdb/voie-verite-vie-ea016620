import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RssSource { name: string; url: string; category: string; country: string | null }

// country=null → article universel (Vatican / église globale)
// country=XX   → actualité locale du pays
const RSS_SOURCES: RssSource[] = [
  // ── Universel (Vatican & agences internationales) ──
  { name: 'Vatican News',       url: 'https://www.vaticannews.va/fr.rss.xml',            category: 'church', country: null },
  { name: 'Radio Vatican',      url: 'https://www.vaticannews.va/fr/podcast/rss-news-fr.xml', category: 'church', country: null },
  { name: 'Aleteia',            url: 'https://fr.aleteia.org/feed/',                     category: 'church', country: null },
  { name: 'Zenit',              url: 'https://fr.zenit.org/feed/',                       category: 'church', country: null },
  { name: 'iMédia',             url: 'https://www.imedias.eu/feed/',                     category: 'church', country: null },
  // ── France ──
  { name: 'La Croix',           url: 'https://www.la-croix.com/RSS/UNIVERS-RELIGION',    category: 'church', country: 'FR' },
  { name: 'Famille Chrétienne', url: 'https://www.famillechretienne.fr/feed/',           category: 'church', country: 'FR' },
  { name: 'KTO',                url: 'https://www.ktotv.com/rss.xml',                    category: 'church', country: 'FR' },
  // ── Italie ──
  { name: 'Vatican News IT',    url: 'https://www.vaticannews.va/it.rss.xml',            category: 'church', country: 'IT' },
  { name: 'ACI Stampa',         url: 'https://www.acistampa.com/rss',                    category: 'church', country: 'IT' },
  // ── Belgique ──
  { name: 'Cathobel',           url: 'https://www.cathobel.be/feed/',                    category: 'church', country: 'BE' },
  // ── Suisse ──
  { name: 'cath.ch',            url: 'https://www.cath.ch/feed/',                        category: 'church', country: 'CH' },
  // ── Espagne / Portugal ──
  { name: 'Aleteia ES',         url: 'https://es.aleteia.org/feed/',                     category: 'church', country: 'ES' },
  { name: 'Aleteia PT',         url: 'https://pt.aleteia.org/feed/',                     category: 'church', country: 'PT' },
  // ── Anglophone ──
  { name: 'Catholic News Agency', url: 'https://www.catholicnewsagency.com/rss/news.xml', category: 'church', country: 'US' },
  { name: 'Catholic Herald',    url: 'https://catholicherald.co.uk/feed/',               category: 'church', country: 'GB' },
]

// ── XML helpers (no external dependency) ──────────────────────────────────────

// Comprehensive HTML entity decoder — handles named + numeric (dec + hex) refs
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™',
  hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', bull: '•', middot: '·', euro: '€',
  agrave: 'à', acirc: 'â', auml: 'ä', aring: 'å', aelig: 'æ',
  ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï', ntilde: 'ñ',
  ograve: 'ò', oacute: 'ó', ocirc: 'ô', ouml: 'ö', oslash: 'ø',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yuml: 'ÿ',
  Agrave: 'À', Acirc: 'Â', Ccedil: 'Ç', Eacute: 'É', Egrave: 'È',
  Ecirc: 'Ê', Icirc: 'Î', Ocirc: 'Ô', Ucirc: 'Û',
}

function decodeEntities(s: string): string {
  if (!s) return ''
  return s
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)) } catch { return '' }
    })
    .replace(/&#(\d+);?/g, (_, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)) } catch { return '' }
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m)
}

function extractCdata(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function extractTag(xml: string, tag: string): string {
  const cdata = extractCdata(xml, tag)
  if (cdata) return decodeEntities(cdata.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  if (!m) return ''
  return decodeEntities(m[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
}

function extractRawTag(xml: string, tag: string): string {
  const cdata = extractCdata(xml, tag)
  if (cdata) return cdata.trim()
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function stripHtml(html: string): string {
  return decodeEntities(html
    .replace(/<a\s+class=["']excerpt-read-more["'][\s\S]*?<\/a>/gi, '')
    .replace(/The post[\s\S]*?appeared first on[\s\S]*?\.?$/i, '')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\bTout lire…?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function imageFromArticleLink(link: string): string {
  try {
    const u = new URL(link)
    if (u.hostname.endsWith('aleteia.org')) {
      const slug = u.pathname.replace(/^\//, '').replace(/\/$/, '')
      if (slug) return `https://aleteia.org/api/og-image?locale=fr&slug=${encodeURIComponent(slug)}`
    }
  } catch { /* ignore */ }
  return ''
}

function findImage(item: string, rawDescription: string, link: string): string {
  const raw = (
    extractAttr(item, 'enclosure', 'url') ||
    extractAttr(item, 'media:content', 'url') ||
    extractAttr(item, 'media:thumbnail', 'url') ||
    extractAttr(item, 'itunes:image', 'href') ||
    (item.match(/<image>[\s\S]*?<url>([\s\S]*?)<\/url>[\s\S]*?<\/image>/i) || [])[1] ||
    (item.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i) || [])[1] ||
    (item.match(/<content:encoded[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
    (rawDescription.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
    imageFromArticleLink(link) ||
    ''
  )
  return decodeEntities(raw).trim()
}

function parseItems(xml: string) {
  return (xml.match(/<item>([\s\S]*?)<\/item>/gi) || []).map(raw => {
    const title = extractTag(raw, 'title')
    const link  = extractTag(raw, 'link') || extractAttr(raw, 'link', 'href')
    const rawDesc = extractRawTag(raw, 'description')
    const rawContent = extractRawTag(raw, 'content:encoded')
    const desc  = stripHtml(rawDesc || rawContent)
    const pubDate = extractTag(raw, 'pubDate') || extractTag(raw, 'published')
    const image = findImage(raw, `${rawDesc}\n${rawContent}`, link)
    return { title, link, excerpt: desc.slice(0, 350), pubDate, image }
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
        country:       src.country,
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
