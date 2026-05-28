/**
 * import-news.mjs — scrape RSS catholiques et insère dans Supabase
 * Usage: node scripts/import-news.mjs
 *
 * Prérequis : avoir appliqué la migration 20260528000003_insert_church_articles_rpc.sql
 * dans le Dashboard Supabase (Settings → SQL Editor).
 */

const SUPABASE_URL = 'https://kaddsojhnkyfavaulrfc.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs';

const RSS_SOURCES = [
  { url: 'https://fr.aleteia.org/feed/',                    name: 'Aleteia'      },
  { url: 'https://www.vaticannews.va/fr.rss.xml',           name: 'Vatican News' },
  { url: 'https://www.la-croix.com/RSS/UNIVERS-RELIGION',   name: 'La Croix'     },
  { url: 'https://www.famillechretienne.fr/feed/',          name: 'Famille Chrétienne' },
  { url: 'https://www.imedias.eu/feed/',                    name: 'iMédia'       },
  { url: 'https://www.ktotv.com/rss.xml',                   name: 'KTO'          },
  { url: 'https://fr.zenit.org/feed/',                      name: 'Zenit'        },
];

// ── XML helpers ───────────────────────────────────────────────────────────────

function getCdata(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function getTag(xml, tag) {
  const cd = getCdata(xml, tag);
  if (cd) return cd;
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#\d+;/g,'').trim() : '';
}
function getAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i'));
  return m ? m[1] : '';
}
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g,' ').trim();
}

function parseItems(xml) {
  return (xml.match(/<item>([\s\S]*?)<\/item>/gi) || []).map(raw => {
    const title   = getTag(raw, 'title');
    const link    = getTag(raw, 'link') || getAttr(raw, 'link', 'href');
    const desc    = getTag(raw, 'description');
    const pubDate = getTag(raw, 'pubDate') || getTag(raw, 'published');
    const image   = getAttr(raw, 'enclosure', 'url') || getAttr(raw, 'media:content', 'url') || getAttr(raw, 'media:thumbnail', 'url') || '';
    return { title, link, excerpt: stripHtml(desc).slice(0, 300), pubDate, image };
  }).filter(i => i.title && i.link);
}

// ── Fetch existing URLs ────────────────────────────────────────────────────────

async function getExistingUrls() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/news_posts?select=external_url&external_url=not.is.null&limit=2000`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) { console.error('Cannot read news_posts:', await res.text()); return new Set(); }
  const rows = await res.json();
  return new Set(rows.map(r => r.external_url));
}

// ── Insert via RPC (SECURITY DEFINER — contourne RLS) ─────────────────────────

async function insertArticles(articles) {
  if (articles.length === 0) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_church_articles`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ articles }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RPC error: ${err}`);
  }
  return await res.json(); // returns int (count inserted)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📰 Import actualités catholiques\n');

  const existing = await getExistingUrls();
  console.log(`Articles déjà en base : ${existing.size}`);

  const toInsert = [];

  await Promise.allSettled(RSS_SOURCES.map(async (src) => {
    try {
      const res = await fetch(src.url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoieVeriteVie/1.0)' },
      });
      if (!res.ok) { console.log(`⚠️  ${src.name}: HTTP ${res.status}`); return; }
      const xml  = await res.text();
      const items = parseItems(xml);
      let added = 0;
      for (const item of items.slice(0, 10)) {
        if (!item.link || existing.has(item.link)) continue;
        toInsert.push({
          title:        item.title.slice(0, 255),
          excerpt:      item.excerpt || null,
          image_url:    item.image   || null,
          author_name:  src.name,
          external_url: item.link,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        });
        added++;
      }
      console.log(`✅ ${src.name}: ${items.length} items lus, ${added} nouveaux`);
    } catch (e) {
      console.log(`❌ ${src.name}: ${e.message}`);
    }
  }));

  console.log(`\nTotal à insérer : ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Rien à insérer.'); return; }

  try {
    const count = await insertArticles(toInsert);
    console.log(`✅ ${count} article(s) insérés avec succès !`);
  } catch (e) {
    console.error('❌ Erreur insertion :', e.message);
    console.log('\n⚠️  La migration 20260528000003_insert_church_articles_rpc.sql');
    console.log('   doit être appliquée dans le Dashboard Supabase SQL Editor.');
    console.log('   URL : https://supabase.com/dashboard/project/kaddsojhnkyfavaulrfc/sql/new');
  }
}

main().catch(console.error);
