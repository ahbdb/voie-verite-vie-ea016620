/**
 * Netlify Edge Function — Assistant IA 3V
 * Modèle : Claude claude-sonnet-4-6 (Anthropic) — dernier modèle en date
 * Fonctionnalités : streaming SSE, extended thinking, contexte liturgique
 */

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')     ?? 'https://kaddsojhnkyfavaulrfc.supabase.co';
const SUPABASE_ANON    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `Tu es l'Assistant Spirituel 3V (Voie-Vérité-Vie), un compagnon catholique bienveillant, cultivé et chaleureux développé pour le mouvement de jeunesse catholique Voie-Vérité-Vie basé au Cameroun.

## Identité & expertise
- Expert en Sainte Écriture (Bible de Jérusalem), théologie catholique, patristique et spiritualité chrétienne
- Connaissance approfondie du Magistère, du Catéchisme de l'Église catholique, des encycliques et des documents conciliaires
- Maîtrise du calendrier liturgique catholique, des temps liturgiques et des sacrements
- Sensible à la culture africaine francophone et aux réalités du catholicisme en Afrique

## Ce que tu peux faire
- Expliquer et méditer les textes liturgiques du jour (évangile, épîtres, psaumes)
- Proposer des prières, méditations, lectio divina, examens de conscience
- Répondre aux questions de foi, morale catholique, vie sacramentelle
- Présenter la doctrine catholique avec la rigueur du Magistère
- Préparer aux sacrements et accompagner le chemin spirituel
- Proposer des homélies, catéchèses, retraites thématiques
- Expliquer les fêtes liturgiques, les saints, l'histoire de l'Église
- Aider à prier le chapelet, les heures de l'office divin, la lectio divina

## Ressources de l'application 3V
Quand c'est pertinent, oriente vers :
- /messe-office → Lectures et prières du jour (AELF)
- /biblical-reading → Lectionnaire et méditation biblique
- /prayer-forum → Forum de prière communautaire
- /chapelet → Guide du chapelet interactif
- /neuvaines → Neuvaines guidées
- /activities → Activités et événements du mouvement
- /calls-lives → Appels et lives de la communauté

## Style de réponse
- Ton fraternel, chaleureux, jamais condescendant — "mon frère", "ma sœur" si approprié
- Citer les Écritures avec précision : livre chapitre:verset (ex: Jean 3,16)
- Utiliser le **Markdown** pour structurer les réponses longues
- Pour les prières : présenter clairement, ligne par ligne
- Pour les méditations : proposer une structure (lecture → méditation → prière → contemplation)
- Adapter la profondeur au niveau de la question
- Pour les citations des Pères de l'Église ou des saints : indiquer la source
- En cas de doute doctrinal sérieux : inviter à consulter un prêtre

## Limites
- Tu ne donnes pas d'avis médical, juridique ou financier
- Tu ne parles pas de politique partisane
- Tu ne critiques pas les autres religions — tu les respectes tout en exposant clairement la foi catholique
- Tu ne modifies pas les textes bibliques officiels`;

// ── Handler ───────────────────────────────────────────────────────────────────
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

  // ── Auth : vérifier le JWT Supabase ─────────────────────────────────────────
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON },
    });
    if (!userRes.ok) throw new Error('Invalid token');
  } catch {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Payload ──────────────────────────────────────────────────────────────────
  let messages: { role: string; content: string }[];
  try {
    const body = await request.json();
    messages = body.messages ?? [];
    if (!messages.length) throw new Error('empty');
  } catch {
    return new Response(JSON.stringify({ error: 'Corps de requête invalide' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!ANTHROPIC_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY non configurée dans les variables Netlify' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // ── Appel Anthropic — Claude claude-sonnet-4-6 avec extended thinking ───────────
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        // Extended thinking : Claude réfléchit en profondeur avant de répondre
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        stream: true,
        thinking: { type: 'enabled', budget_tokens: 8000 },
        system: SYSTEM,
        messages: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Impossible de contacter Anthropic: ${String(err)}` }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return new Response(JSON.stringify({ error: `Anthropic ${anthropicRes.status}: ${errText}` }), {
      status: anthropicRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Stream : Anthropic SSE → OpenAI SSE (compatible AIChat.tsx) ──────────────
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();
      let buf = '';
      let isThinking = false;

      const enq = (data: string) =>
        controller.enqueue(encoder.encode(data));

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

              switch (evt.type) {
                case 'content_block_start':
                  if (evt.content_block?.type === 'thinking') {
                    isThinking = true;
                    // Signaler au client que l'IA "réfléchit"
                    enq(`data: ${JSON.stringify({ type: 'thinking_start' })}\n\n`);
                  } else if (evt.content_block?.type === 'text') {
                    if (isThinking) {
                      isThinking = false;
                      enq(`data: ${JSON.stringify({ type: 'thinking_end' })}\n\n`);
                    }
                  }
                  break;

                case 'content_block_delta':
                  if (evt.delta?.type === 'text_delta' && evt.delta.text) {
                    // Format compatible OpenAI pour le client existant
                    enq(`data: ${JSON.stringify({
                      choices: [{ delta: { content: evt.delta.text }, finish_reason: null }],
                    })}\n\n`);
                  }
                  // Ignorer les thinking_delta (ne pas les envoyer au client)
                  break;

                case 'message_stop':
                  enq('data: [DONE]\n\n');
                  break;
              }
            } catch { /* ligne malformée — ignorer */ }
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
