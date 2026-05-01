// Session Share — renders Open Graph HTML + dynamic SVG/PNG image
// for WhatsApp / Facebook / Twitter / Telegram link previews.
// Public endpoint (verify_jwt = false).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APP_ORIGIN = "https://voie-verite-vie.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatGmt(dateIso: string, timeStr: string): { dateLabel: string; timeLabel: string; isoUtc: string } {
  // scheduled_date = YYYY-MM-DD, scheduled_time = HH:MM:SS treated as UTC/GMT
  const iso = `${dateIso}T${timeStr}Z`;
  const d = new Date(iso);
  const dateLabel = d.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return { dateLabel, timeLabel: `${hh}:${mm} GMT`, isoUtc: iso };
}

function renderSvg(session: any): string {
  const { dateLabel, timeLabel } = formatGmt(session.scheduled_date, session.scheduled_time);
  const isLive = session.status === "live";
  const title = escapeXml((session.title || "Session 3V").slice(0, 60));
  const desc = escapeXml((session.description || "Voie • Vérité • Vie").slice(0, 120));
  const typeLabel = session.session_type === "audio" ? "🎙 AUDIO"
    : session.session_type === "live" ? "🔴 LIVE"
    : "📹 VIDÉO";
  const statusBadge = isLive ? "● EN DIRECT" : "● PROGRAMMÉ";
  const statusFill = isLive ? "#ef4444" : "#d4af37";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1628"/>
      <stop offset="50%" stop-color="#1a2942"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#f5d76e"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${statusFill}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${statusFill}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="950" cy="120" r="200" fill="url(#glow)"/>
  <circle cx="200" cy="500" r="180" fill="url(#glow)" opacity="0.5"/>

  <!-- Top bar -->
  <rect x="60" y="60" width="1080" height="2" fill="url(#gold)" opacity="0.6"/>
  <text x="60" y="48" font-family="Georgia, serif" font-size="22" fill="#d4af37" letter-spacing="6">VOIE • VÉRITÉ • VIE</text>

  <!-- Status badge -->
  <rect x="60" y="100" width="${isLive ? 180 : 200}" height="44" rx="22" fill="${statusFill}"/>
  <text x="${60 + (isLive ? 90 : 100)}" y="130" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">${statusBadge}</text>

  <!-- Type badge -->
  <rect x="${isLive ? 260 : 280}" y="100" width="160" height="44" rx="22" fill="none" stroke="#d4af37" stroke-width="2"/>
  <text x="${isLive ? 340 : 360}" y="130" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#d4af37" text-anchor="middle">${typeLabel}</text>

  <!-- Title -->
  <text x="60" y="260" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="white">${title.slice(0, 30)}</text>
  ${title.length > 30 ? `<text x="60" y="335" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="white">${title.slice(30, 60)}</text>` : ""}

  <!-- Description -->
  <text x="60" y="${title.length > 30 ? 395 : 330}" font-family="Arial, sans-serif" font-size="26" fill="#cbd5e1">${desc.slice(0, 70)}</text>

  <!-- Date/Time block -->
  <rect x="60" y="460" width="1080" height="100" rx="16" fill="#ffffff" fill-opacity="0.06" stroke="#d4af37" stroke-opacity="0.3"/>
  <text x="90" y="500" font-family="Arial, sans-serif" font-size="18" fill="#d4af37" letter-spacing="2">📅 DATE</text>
  <text x="90" y="535" font-family="Georgia, serif" font-size="28" fill="white" font-weight="bold">${escapeXml(dateLabel)}</text>

  <text x="700" y="500" font-family="Arial, sans-serif" font-size="18" fill="#d4af37" letter-spacing="2">⏰ HEURE</text>
  <text x="700" y="535" font-family="Georgia, serif" font-size="28" fill="white" font-weight="bold">${escapeXml(timeLabel)}</text>

  <!-- Bottom CTA -->
  <text x="600" y="605" font-family="Arial, sans-serif" font-size="20" fill="#d4af37" text-anchor="middle" letter-spacing="3">${isLive ? "👉 REJOIGNEZ-NOUS MAINTENANT" : "👉 voie-verite-vie.lovable.app"}</text>
</svg>`;
}

function renderHtml(session: any, shareUrl: string, imageUrl: string): string {
  const { dateLabel, timeLabel } = formatGmt(session.scheduled_date, session.scheduled_time);
  const isLive = session.status === "live";
  const title = escapeXml(session.title || "Session 3V");
  const desc = escapeXml(
    `${isLive ? "🔴 EN DIRECT — " : ""}${session.description || "Rejoignez la communauté Voie Vérité Vie"} • ${dateLabel} à ${timeLabel}`
  );
  const appUrl = `${APP_ORIGIN}/calls-lives?join=${session.id}`;

  return `<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} — Voie Vérité Vie</title>
<meta name="description" content="${desc}"/>

<!-- Open Graph (Facebook, WhatsApp, Telegram, LinkedIn) -->
<meta property="og:type" content="${isLive ? "video.other" : "website"}"/>
<meta property="og:site_name" content="Voie Vérité Vie"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:url" content="${shareUrl}"/>
<meta property="og:image" content="${imageUrl}"/>
<meta property="og:image:secure_url" content="${imageUrl}"/>
<meta property="og:image:type" content="image/svg+xml"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${title}"/>
<meta property="og:locale" content="fr_FR"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
<meta name="twitter:image" content="${imageUrl}"/>

<!-- Auto-redirect humans to the app -->
<meta http-equiv="refresh" content="0; url=${appUrl}"/>
<link rel="canonical" href="${appUrl}"/>
<style>
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0a1628;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
  a{color:#d4af37;text-decoration:none;font-weight:bold}
</style>
</head>
<body>
  <div>
    <h1 style="font-family:Georgia,serif;color:#d4af37">${title}</h1>
    <p>${dateLabel} • ${timeLabel}</p>
    <p><a href="${appUrl}">→ Ouvrir dans l'application</a></p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Path: /session-share/:id  or  /session-share/:id/image.svg
    const parts = url.pathname.split("/").filter(Boolean);
    // ['session-share', ':id'] or ['session-share', ':id', 'image.svg']
    const sessionId = parts[1];
    const wantsImage = parts[2] === "image.svg" || url.searchParams.get("format") === "image";

    if (!sessionId) {
      return new Response("Missing session id", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: session, error } = await supabase
      .from("scheduled_sessions")
      .select("id, title, description, session_type, scheduled_date, scheduled_time, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) {
      return new Response("Session not found", { status: 404, headers: corsHeaders });
    }

    if (wantsImage) {
      return new Response(renderSvg(session), {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    const shareUrl = `${url.origin}${url.pathname}`;
    const imageUrl = `${url.origin}/functions/v1/session-share/${sessionId}/image.svg`;

    return new Response(renderHtml(session, shareUrl, imageUrl), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    console.error("session-share error:", err);
    return new Response(`Error: ${String(err)}`, { status: 500, headers: corsHeaders });
  }
});