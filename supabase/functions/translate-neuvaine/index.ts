/**
 * translate-neuvaine — traduit le contenu d'une neuvaine (FR -> en/it)
 * et stocke le résultat dans neuvaines.translations[lang].
 * Modèle : Lovable AI Gateway (google/gemini-3.6-flash), sortie JSON stricte.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANG_NAME: Record<string, string> = { en: 'English', it: 'Italiano' };

async function translateChunk(payload: unknown, lang: string): Promise<any> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': LOVABLE_API_KEY,
      'X-Lovable-AIG-SDK': 'fetch',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.6-flash',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `You are a professional Catholic liturgical translator. Translate the JSON values from French into ${LANG_NAME[lang]}. ` +
            `Rules: keep the exact same JSON structure and keys; translate ONLY string values; never translate numbers; ` +
            `use the official Catholic liturgical wording of the target language for prayers (Our Father, Hail Mary, Glory Be, litany responses…), ` +
            `and the official book names for Scripture references (e.g. "Jn 3, 16" -> "Jn 3:16" in English). ` +
            `Preserve line breaks (\\n) and the structure of litanies. Return json only.`,
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`gateway ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';
  const cleaned = String(raw).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    if (!LOVABLE_API_KEY) return json({ error: 'AI not configured' }, 500);
    const { id, langs = ['en', 'it'], force = false } = await req.json();
    if (!id) return json({ error: 'id required' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: n, error } = await admin.from('neuvaines').select('*').eq('id', id).single();
    if (error || !n) return json({ error: 'neuvaine not found' }, 404);

    const translations: Record<string, any> = (n.translations as any) ?? {};
    const done: string[] = [];

    for (const lang of langs as string[]) {
      if (!LANG_NAME[lang]) continue;
      if (translations[lang] && !force) { done.push(`${lang} (cached)`); continue; }

      const meta = {
        title: n.title ?? '',
        saint_name: n.saint_name ?? '',
        description: n.description ?? '',
        introduction: n.introduction ?? '',
      };
      const days: any[] = Array.isArray(n.days) ? (n.days as any[]) : [];

      const [metaOut, prayersOut, conclusionOut, ...dayOut] = await Promise.all([
        translateChunk(meta, lang),
        n.common_prayers ? translateChunk(n.common_prayers, lang) : Promise.resolve(null),
        n.conclusion ? translateChunk(n.conclusion, lang) : Promise.resolve(null),
        ...days.map((d) => translateChunk(d, lang)),
      ]);

      translations[lang] = {
        ...metaOut,
        common_prayers: prayersOut ?? n.common_prayers,
        conclusion: conclusionOut ?? n.conclusion,
        days: dayOut.map((d: any, i: number) => ({ ...d, day: days[i]?.day ?? i + 1 })),
        pdf_url: n.pdf_url,
        _translated_at: new Date().toISOString(),
      };
      done.push(lang);
    }

    const { error: upErr } = await admin.from('neuvaines').update({ translations }).eq('id', id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, id, title: n.title, langs: done });
  } catch (err) {
    console.error('translate-neuvaine error', err);
    return json({ error: String(err) }, 500);
  }
});
