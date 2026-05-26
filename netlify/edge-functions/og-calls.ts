/**
 * Netlify Edge Function — Dynamic OG meta tags for call/live share links.
 *
 * When WhatsApp, Telegram, Facebook, etc. scrape /calls-lives?session=…
 * they receive a tiny HTML page with accurate og:title / og:description.
 * Normal browser requests fall through to the SPA (index.html).
 */

const BOT_PATTERN =
  /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest|Snapchat|redditbot|vkShare|W3C_Validator/i;

export default async function handler(
  request: Request,
  context: { next: () => Promise<Response> },
): Promise<Response> {
  const ua = request.headers.get('user-agent') ?? '';
  const url = new URL(request.url);
  const p = url.searchParams;
  const sessionId = p.get('session');

  // Let normal browsers through (no session param OR not a bot)
  if (!sessionId || !BOT_PATTERN.test(ua)) {
    return context.next();
  }

  const title = p.get('title') ?? 'Session';
  const type  = p.get('type')  ?? 'audio';
  const date  = p.get('date')  ?? '';
  const time  = p.get('time')  ?? '';
  const desc  = p.get('desc')  ?? '';
  const img   = p.get('img')   ?? 'https://voie-verite-vie.netlify.app/opengraph.jpg';

  const label    = sessionLabel(type, title);
  const ogTitle  = `Rejoins ${label} — ${title}`;
  const dateStr  = formatDate(date);
  const timeStr  = time ? `${time} GMT` : '';           // time stored in DB is UTC/GMT
  const dateLine = [dateStr, timeStr].filter(Boolean).join(' à ');
  // Use the session description when available; fall back to a generic line
  const ogDesc = desc
    ? `${dateLine} · ${desc}`
    : `${dateLine} — Rejoindre la communauté Voie Vérité Vie`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${h(request.url)}" />
  <meta property="og:title"       content="${h(ogTitle)}" />
  <meta property="og:description" content="${h(ogDesc)}" />
  <meta property="og:image"       content="${h(img)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name"   content="Voie, Vérité, Vie (3V)" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${h(ogTitle)}" />
  <meta name="twitter:description" content="${h(ogDesc)}" />
  <meta name="twitter:image"       content="${h(img)}" />
  <title>${h(ogTitle)}</title>
  <script>window.location.replace(${JSON.stringify(request.url)});</script>
</head>
<body><p>Redirection…</p></body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function h(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d: string): string {
  const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return d;
  return `${day} ${months[m - 1]} ${y}`;
}

function sessionLabel(type: string, title: string): string {
  const t = (title ?? '').toLowerCase();
  if (/pri[eè]re|adoration|chapelet|rosaire|onction/.test(t)) return 'la Prière';
  if (/d[eé]bat|inquisition|discussion|forum/.test(t))        return 'le Débat';
  if (/messe|eucharistie|liturgie/.test(t))                   return 'la Messe';
  if (/conf[eé]rence/.test(t))                                return 'la Conférence';
  if (/formation|cours/.test(t))                              return 'la Formation';
  if (/veill[eé]e/.test(t))                                   return 'la Veillée';
  if (/louange|worship/.test(t))                              return 'la Louange';
  if (/partage|t[eé]moignage/.test(t))                        return 'le Partage';
  if (/retraite/.test(t))                                     return 'la Retraite';
  if (type === 'video') return 'la Visioconférence';
  if (type === 'live')  return 'le Live';
  return "l'Appel";
}

export const config = { path: '/calls-lives' };
