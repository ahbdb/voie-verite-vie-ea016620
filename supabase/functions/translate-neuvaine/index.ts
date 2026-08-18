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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function translateChunk(payload: unknown, lang: string, attempt = 0): Promise<any> {
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
  if (res.status === 429 || res.status >= 500) {
    const detail = await res.text().catch(() => '');
    if (attempt >= 5) throw new Error(`gateway ${res.status}: ${detail.slice(0, 200)}`);
    const retryAfter = Number(res.headers.get('Retry-After') ?? 0);
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(30000, 2000 * 2 ** attempt) + Math.random() * 500;
    await sleep(wait);
    return translateChunk(payload, lang, attempt + 1);
  }
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
    // Une invocation = une seule partie traduite (limite de 150 s par requête).
    // part : 'meta' | 'prayers' | 'conclusion' | 'day:<index 1-based>'
    const { id, lang, part = 'meta', force = false } = await req.json();
    if (!id || !LANG_NAME[lang]) return json({ error: 'id and lang (en|it) required' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: n, error } = await admin.from('neuvaines').select('*').eq('id', id).single();
    if (error || !n) return json({ error: 'neuvaine not found' }, 404);

    const translations: Record<string, any> = (n.translations as any) ?? {};
    const tr: Record<string, any> = translations[lang] ?? {};
    const days: any[] = Array.isArray(n.days) ? (n.days as any[]) : [];

    if (part === 'meta') {
      if (!tr.title || force) {
        const out = await translateChunk(
          {
            title: n.title ?? '',
            saint_name: n.saint_name ?? '',
            description: n.description ?? '',
            introduction: n.introduction ?? '',
          },
          lang,
        );
        Object.assign(tr, out, { pdf_url: n.pdf_url });
      }
    } else if (part === 'prayers') {
      if ((!tr.common_prayers || force) && n.common_prayers) {
        tr.common_prayers = await translateChunk(n.common_prayers, lang);
      }
    } else if (part === 'conclusion') {
      if ((!tr.conclusion || force) && n.conclusion) {
        tr.conclusion = await translateChunk(n.conclusion, lang);
      }
    } else if (String(part).startsWith('day:')) {
      const idx = Number(String(part).slice(4));
      const src = days[idx - 1];
      if (!src) return json({ error: `day ${idx} not found` }, 400);
      const existing: any[] = Array.isArray(tr.days) ? tr.days : [];
      if (!existing[idx - 1] || force) {
        const out = await translateChunk(src, lang);
        existing[idx - 1] = { ...out, day: src.day ?? idx };
        tr.days = existing;
      }
    } else {
      return json({ error: 'invalid part' }, 400);
    }

    tr._translated_at = new Date().toISOString();
    translations[lang] = tr;

    const { error: upErr } = await admin.from('neuvaines').update({ translations }).eq('id', id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, id, lang, part, totalDays: days.length });
  } catch (err) {
    console.error('translate-neuvaine error', err);
    return json({ error: String(err) }, 500);
  }
});
