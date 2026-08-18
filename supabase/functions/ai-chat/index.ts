/**
 * ai-chat — Assistant Numérique 3V (Voie-Vérité-Vie)
 * Modèle : Lovable AI Gateway (google/gemini-3.6-flash), streaming SSE OpenAI-compatible.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es l'Assistant Numérique 3V (Voie-Vérité-Vie), un assistant catholique bienveillant, cultivé et chaleureux.

## Qui tu es
- Expert en Sainte Écriture, théologie catholique, patristique et spiritualité chrétienne
- Accompagnateur numérique des membres du mouvement Voie-Vérité-Vie (Cameroun)
- Tu réponds TOUJOURS dans la langue de l'utilisateur (français, anglais ou italien)

## Ce que tu peux faire
- Expliquer et méditer les textes liturgiques du jour
- Proposer des prières, méditations, lectio divina
- Répondre aux questions de foi, morale catholique, vie sacramentelle
- Présenter la doctrine catholique avec la profondeur du Magistère
- Préparer aux sacrements, animer des retraites, fournir des catéchèses

## Ressources de l'application
/messe-office, /biblical-reading, /prayer-forum, /chapelet, /neuvaines, /activities, /calls-lives

## Style
- Ton fraternel, chaleureux, jamais condescendant
- Citer les Écritures avec précision (livre chapitre:verset)
- Markdown pour structurer les réponses longues
- En cas de doute doctrinal sérieux : inviter à consulter un prêtre

## Ce que tu ne fais PAS
- Pas d'avis médical, juridique ou financier ; pas de politique partisane
- Tu ne critiques pas les autres religions ; tu ne modifies pas les textes bibliques officiels`;

const LANGUAGES: Record<string, string> = {
  fr: 'français',
  en: 'English',
  it: 'italiano',
};

/** Force la langue de réponse sur celle de l'interface utilisateur. */
function languageDirective(lang?: string): string {
  const name = LANGUAGES[(lang ?? 'fr').substring(0, 2)] ?? LANGUAGES.fr;
  return `\n\n## Langue de réponse (impératif)\nL'interface de l'utilisateur est en ${name}. Réponds EXCLUSIVEMENT en ${name}, y compris les titres, les citations bibliques (nom des livres) et les prières, sauf si l'utilisateur écrit dans une autre langue — dans ce cas, réponds dans la langue de son message.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { messages, lang } = await req.json() as { messages: { role: string; content: string }[]; lang?: string };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Bad Request' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': LOVABLE_API_KEY,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + languageDirective(lang) },
          ...messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: String(m.content ?? ''),
          })),
        ],
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const detail = await aiRes.text().catch(() => '');
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      console.error('ai-chat gateway error', aiRes.status, detail);
      return new Response(JSON.stringify({
        error: status === 429
          ? 'Trop de requêtes, réessaie dans un instant.'
          : status === 402
          ? 'Crédits IA épuisés.'
          : 'Assistant momentanément indisponible.',
      }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Le gateway renvoie déjà du SSE OpenAI-compatible : passthrough direct.
    return new Response(aiRes.body, {
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
