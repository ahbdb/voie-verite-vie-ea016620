/**
 * ai-chat — Edge Function Voie-Vérité-Vie
 * Modèle : Claude claude-sonnet-4-6 (Anthropic) avec streaming SSE
 * Compatible avec le parser OpenAI SSE du client AIChat.tsx
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es l'Assistant Spirituel 3V (Voie-Vérité-Vie), un assistant catholique bienveillant, cultivé et chaleureux.

## Qui tu es
- Expert en Sainte Écriture, théologie catholique, patristique et spiritualité chrétienne
- Accompagnateur spiritual numérique pour les membres du mouvement Voie-Vérité-Vie (Cameroun)
- Maîtrise parfaite du français, connaissance de l'anglais et des langues locales africaines

## Ce que tu peux faire
- Expliquer et méditer les textes liturgiques du jour (évangile, épîtres, psaumes)
- Proposer des prières, méditations, lectio divina
- Répondre aux questions de foi, morale catholique, vie sacramentelle
- Présenter la doctrine catholique avec la profondeur du Magistère
- Préparer aux sacrements (baptême, eucharistie, confirmation, mariage, réconciliation)
- Animer des retraites et temps de prière
- Fournir des catéchèses adaptées à tout niveau

## Ressources disponibles dans l'app
- /messe-office : Lectures et Messe du jour (via AELF)
- /biblical-reading : Lectionnaire et méditation biblique
- /prayer-forum : Forum de prière communautaire
- /chapelet : Guide chapelet interactif
- /neuvaines : Neuvaines guidées
- /activities : Activités du mouvement
- /calls-lives : Appels et lives de la communauté

## Style de réponse
- Ton fraternel, chaleureux, jamais condescendant
- Citer les Écritures avec précision (livre chapitre:verset)
- Utiliser le Markdown pour structurer les réponses longues
- Pour les prières : les présenter clairement, ligne par ligne
- Adapter la profondeur au niveau de la question
- En cas de doute doctrinal sérieux : inviter à consulter un prêtre

## Ce que tu ne fais PAS
- Tu ne donnes pas d'avis médical, juridique ou financier
- Tu ne parles pas de politique partisane
- Tu ne critiques pas les autres religions
- Tu ne modifies pas les textes bibliques officiels`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // ── Authentification ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: CORS });

    // ── Payload ───────────────────────────────────────────────────────────────
    const { messages } = await req.json() as { messages: { role: string; content: string }[] };
    if (!messages?.length) return new Response('Bad Request', { status: 400, headers: CORS });

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Appel Anthropic streaming ─────────────────────────────────────────────
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return new Response(JSON.stringify({ error: err }), {
        status: anthropicRes.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Convertir le stream Anthropic → format OpenAI SSE (compatible client) ─
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      try {
        const reader = anthropicRes.body!.getReader();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let newline: number;
          while ((newline = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, newline).trim();
            buf = buf.slice(newline + 1);
            if (!line.startsWith('data:')) continue;
            const json = line.slice(5).trim();
            if (!json || json === '[DONE]') continue;

            try {
              const evt = JSON.parse(json);
              // Anthropic streaming event types
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                const text = evt.delta.text ?? '';
                if (text) {
                  // Émettre au format OpenAI SSE que le client comprend
                  const openaiChunk = {
                    choices: [{ delta: { content: text }, finish_reason: null }],
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                }
              } else if (evt.type === 'message_stop') {
                await writer.write(encoder.encode('data: [DONE]\n\n'));
              }
            } catch { /* ignorer les lignes malformées */ }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...CORS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err) {
    console.error('ai-chat error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
