/**
 * Netlify Edge Function — Assistant IA 3V (Gemini)
 * Modèle : gemini-2.5-flash (dernier modèle Google, mai 2025)
 * Fonctionnalités : streaming SSE, vision, system prompt spirituel complet
 *
 * Variable d'environnement requise : GEMINI_API_KEY
 * Si absente → fallback vers la fonction Supabase existante
 */

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')       ?? 'https://kaddsojhnkyfavaulrfc.supabase.co';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')  ?? '';
const GEMINI_KEY    = Deno.env.get('GEMINI_API_KEY')      ?? '';

// Dernier modèle Gemini disponible
const GEMINI_MODEL  = 'gemini-2.5-flash';
const GEMINI_URL    = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── System prompt spirituel 3V ────────────────────────────────────────────────
const SYSTEM = `Tu es l'Assistant Spirituel 3V (Voie-Vérité-Vie), un compagnon catholique bienveillant et cultivé développé pour le mouvement de jeunesse catholique Voie-Vérité-Vie basé au Cameroun.

## Expertise
- Sainte Écriture (Bible de Jérusalem), théologie catholique, patristique et spiritualité chrétienne
- Magistère de l'Église, Catéchisme catholique, encycliques, documents du Concile Vatican II
- Calendrier liturgique, sacrements, prières, offices divins
- Sensibilité à la culture africaine francophone et au catholicisme en Afrique centrale

## Ce que tu fais
- Expliquer et méditer les textes liturgiques du jour (évangile, épîtres, psaumes)
- Proposer prières, méditations, lectio divina, examens de conscience
- Répondre aux questions de foi, morale catholique, vie sacramentelle
- Préparer aux sacrements et accompagner le chemin spirituel
- Catéchèses, homélies, retraites thématiques, fêtes et saints du calendrier
- Analyser des images religieuses, icônes, tableaux si l'utilisateur en envoie une

## Ressources de l'app 3V
/messe-office • /biblical-reading • /prayer-forum • /chapelet • /neuvaines • /activities

## Style
- Fraternel et chaleureux, jamais condescendant
- Citer les Écritures avec précision (ex : Jean 3,16)
- Utiliser le **Markdown** pour structurer
- Adapter la profondeur au niveau de la question
- Pour les questions médicales/juridiques : orienter vers les professionnels`;

// ── Convertir messages OpenAI → format Gemini ─────────────────────────────────
function toGeminiContents(messages: { role: string; content: string }[]) {
  return messages
    .filter(m => !m.content.startsWith('[Contexte système')) // filtrer le msg contexte
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

export default async function handler(
  request: Request,
  context: { next: () => Promise<Response> },
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  // ── Auth JWT Supabase ─────────────────────────────────────────────────────────
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON },
    });
    if (!r.ok) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Payload ───────────────────────────────────────────────────────────────────
  let messages: { role: string; content: string }[];
  try {
    messages = (await request.json()).messages ?? [];
    if (!messages.length) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps invalide' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Si pas de clé Gemini → proxy vers Supabase (fallback) ────────────────────
  if (!GEMINI_KEY) {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream' },
    });
  }

  // ── Appel Gemini 2.5 Flash ────────────────────────────────────────────────────
  // Contexte date dans le premier message utilisateur
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const contents = toGeminiContents(messages);
  if (contents.length > 0 && contents[0].role === 'user') {
    contents[0].parts[0].text = `[Aujourd'hui : ${today}]\n\n${contents[0].parts[0].text}`;
  }

  let geminiRes: Response;
  try {
    geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          topP: 0.95,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Gemini inaccessible: ${String(err)}` }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return new Response(JSON.stringify({ error: `Gemini ${geminiRes.status}: ${errText}` }), {
      status: geminiRes.status, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Convertir stream Gemini → format OpenAI SSE (compatible AIChat.tsx) ───────
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body!.getReader();
      let buf = '';

      const enq = (data: string) => controller.enqueue(encoder.encode(data));

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, nl).replace(/\r$/, '');
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[DONE]') continue;

            try {
              const evt = JSON.parse(raw);
              // Gemini renvoie candidates[0].content.parts[0].text dans chaque chunk
              const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
              if (text) {
                enq(`data: ${JSON.stringify({
                  choices: [{ delta: { content: text }, finish_reason: null }],
                })}\n\n`);
              }
              // Fin de génération
              if (evt?.candidates?.[0]?.finishReason === 'STOP') {
                enq('data: [DONE]\n\n');
              }
            } catch { /* ignorer les lignes malformées */ }
          }
        }
        enq('data: [DONE]\n\n');
      } catch (err) {
        enq(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
