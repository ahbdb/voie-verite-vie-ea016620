/**
 * import-news.mjs — scrape RSS catholiques + OG images → Supabase
 * Usage: node scripts/import-news.mjs
 */

const SUPABASE_URL = 'https://kaddsojhnkyfavaulrfc.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0';

const RSS_SOURCES = [
  { url: 'https://fr.aleteia.org/feed/',                    name: 'Aleteia'            },
  { url: 'https://www.vaticannews.va/fr.rss.xml',           name: 'Vatican News'       },
  { url: 'https://www.la-croix.com/RSS/UNIVERS-RELIGION',   name: 'La Croix'           },
  { url: 'https://www.famillechretienne.fr/feed/',          name: 'Famille Chrétienne' },
  { url: 'https://www.imedias.eu/feed/',                    name: 'iMédia'             },
  { url: 'https://fr.zenit.org/feed/',                      name: 'Zenit'              },
  { url: 'https://www.ktotv.com/rss.xml',                   name: 'KTO'                },
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
  return m ? m[1].replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#\d+;/g,'').trim() : '';
}
function getAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i'));
  return m ? m[1] : '';
}
function stripHtml(html) {
  return html.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
}

function parseItems(xml) {
  // Fix encoding issues (latin1 feeds served as UTF-8)
  const decoded = xml.replace(/Ã©/g,'é').replace(/Ã¨/g,'è').replace(/Ã /g,'à').replace(/Ã¢/g,'â')
    .replace(/Ã®/g,'î').replace(/Ã´/g,'ô').replace(/Ã»/g,'û').replace(/Ãª/g,'ê')
    .replace(/Ã§/g,'ç').replace(/Å"/g,'œ').replace(/Ã«/g,'ë').replace(/Ã¹/g,'ù')
    .replace(/â/g,"'").replace(/â/g,'«').replace(/â/g,'»').replace(/â/g,'—')
    .replace(/Ã/g,'É').replace(/Ã/g,'È').replace(/Ã/g,'À').replace(/Ã/g,'Â');
  return (decoded.match(/<item>([\s\S]*?)<\/item>/gi) || []).map(raw => {
    const title   = getTag(raw, 'title');
    const link    = getTag(raw, 'link') || getAttr(raw, 'link', 'href');
    const desc    = getTag(raw, 'description') || getCdata(raw, 'description');
    const pubDate = getTag(raw, 'pubDate') || getTag(raw, 'published');
    // Try all known image tags
    const image   = getAttr(raw, 'enclosure', 'url')
                  || getAttr(raw, 'media:content', 'url')
                  || getAttr(raw, 'media:thumbnail', 'url')
                  || (desc.match(/<img[^>]+src=["']([^"']+)["']/i)||[])[1]
                  || '';
    const excerpt = stripHtml(desc).slice(0, 300);
    return { title, link, excerpt, pubDate, image };
  }).filter(i => i.title && i.link);
}

// ── Fetch OG image from article page ─────────────────────────────────────────

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
           || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function getExistingUrls() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/news_posts?select=external_url&external_url=not.is.null&limit=2000`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) { console.error('Cannot read news_posts:', await res.text()); return new Set(); }
  const rows = await res.json();
  return new Set(rows.map(r => r.external_url));
}

async function deleteNoImageArticles() {
  // Delete scraped articles without images so we can re-insert with images
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/delete_church_no_image`,
    { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }, body: '{}' }
  );
  // Ignore error if function doesn't exist
  return res.ok ? await res.json() : 0;
}

async function insertArticles(articles) {
  if (articles.length === 0) return 0;
  // Try reimport (deletes no-image articles first) then fall back to simple insert
  for (const fn of ['reimport_church_articles', 'insert_church_articles']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (res.ok) return await res.json();
    const err = await res.text();
    if (err.includes('Could not find')) continue; // function not deployed, try next
    throw new Error(`RPC ${fn} error: ${err}`);
  }
  throw new Error('No RPC function available');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📰 Import actualités catholiques (avec images OG)\n');

  const existing = await getExistingUrls();
  console.log(`Articles déjà en base : ${existing.size}`);

  // Step 1: collect raw items from all feeds
  const rawItems = []; // { title, link, excerpt, pubDate, image, sourceName }
  await Promise.allSettled(RSS_SOURCES.map(async (src) => {
    try {
      const res = await fetch(src.url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': UA },
      });
      if (!res.ok) { console.log(`⚠️  ${src.name}: HTTP ${res.status}`); return; }
      const xml   = await res.text();
      const items = parseItems(xml);
      let newCount = 0;
      for (const item of items.slice(0, 10)) {
        if (!item.link || existing.has(item.link)) continue;
        rawItems.push({ ...item, sourceName: src.name });
        newCount++;
      }
      console.log(`✅ ${src.name}: ${items.length} items, ${newCount} nouveaux`);
    } catch (e) {
      console.log(`❌ ${src.name}: ${e.message}`);
    }
  }));

  console.log(`\n→ ${rawItems.length} articles à enrichir avec OG images…`);

  // Step 2: fetch OG images concurrently (max 5 at a time via batching)
  const BATCH = 5;
  for (let i = 0; i < rawItems.length; i += BATCH) {
    const batch = rawItems.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(async (item) => {
      if (item.image) return; // already has an image from feed
      const og = await fetchOgImage(item.link);
      if (og) { item.image = og; process.stdout.write('🖼 '); }
      else     { process.stdout.write('· '); }
    }));
  }
  console.log(`\n\nImages: ${rawItems.filter(i => i.image).length}/${rawItems.length} trouvées`);

  // Step 3: build insert payload
  const toInsert = rawItems.map(item => ({
    title:        item.title.slice(0, 255),
    excerpt:      item.excerpt || null,
    image_url:    item.image   || null,
    author_name:  item.sourceName,
    external_url: item.link,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
  }));

  if (toInsert.length === 0) { console.log('\nRien à insérer.'); return; }

  console.log(`\nTotal à insérer : ${toInsert.length}`);
  try {
    const count = await insertArticles(toInsert);
    console.log(`✅ ${count} article(s) insérés avec succès !`);
  } catch (e) {
    console.error('❌ Erreur insertion :', e.message);
  }
}

main().catch(console.error);
