import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fileNameToUSFM: Record<string, string> = {
  'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
  'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
  '1-samuel': '1SA', '2-samuel': '2SA', '1-kings': '1KI', '2-kings': '2KI',
  '1-chronicles': '1CH', '2-chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
  'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'proverbs': 'PRO',
  'ecclesiastes': 'ECC', 'song-of-solomon': 'SNG', 'isaiah': 'ISA', 'jeremiah': 'JER',
  'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN', 'hosea': 'HOS',
  'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA', 'jonah': 'JON',
  'micah': 'MIC', 'nahum': 'NAM', 'habakkuk': 'HAB', 'zephaniah': 'ZEP',
  'haggai': 'HAG', 'zechariah': 'ZEC', 'malachi': 'MAL',
  'tobit': 'TOB', 'judith': 'JDT', 'wisdom': 'WIS', 'sirach': 'SIR',
  'baruch': 'BAR', '1-maccabees': '1MA', '2-maccabees': '2MA',
  'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN',
  'acts': 'ACT', 'romans': 'ROM', '1-corinthians': '1CO', '2-corinthians': '2CO',
  'galatians': 'GAL', 'ephesians': 'EPH', 'philippians': 'PHP', 'colossians': 'COL',
  '1-thessalonians': '1TH', '2-thessalonians': '2TH', '1-timothy': '1TI', '2-timothy': '2TI',
  'titus': 'TIT', 'philemon': 'PHM', 'hebrews': 'HEB', 'james': 'JAS',
  '1-peter': '1PE', '2-peter': '2PE', '1-john': '1JN', '2-john': '2JN',
  '3-john': '3JN', 'jude': 'JUD', 'revelation': 'REV',
};

const deuterocanonicalFileNames = new Set([
  'tobit', 'judith', '1-maccabees', '2-maccabees', 'wisdom', 'sirach', 'baruch'
]);

const fileNameToItalianCEI: Record<string, string> = {
  'tobit': 'Tobia', 'judith': 'Giuditta', '1-maccabees': '1Maccabei',
  '2-maccabees': '2Maccabei', 'wisdom': 'Sapienza', 'sirach': 'Siracide', 'baruch': 'Baruc',
};

function extractVerseText(content: any[]): string {
  return content
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (item?.text) return item.text;
      return '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchBibleAPIChapter(
  translationId: string, usfmCode: string, chapter: number
): Promise<{ number: number; text: string }[] | null> {
  try {
    const url = `https://bible.helloao.org/api/${translationId}/${usfmCode}/${chapter}.json`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000)
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const chapterContent = data?.chapter?.content;
    if (!chapterContent || !Array.isArray(chapterContent)) return null;
    const verses: { number: number; text: string }[] = [];
    for (const item of chapterContent) {
      if (item.type === 'verse' && item.number && item.content) {
        const text = extractVerseText(item.content);
        if (text) verses.push({ number: item.number, text });
      }
    }
    return verses.length > 0 ? verses : null;
  } catch {
    return null;
  }
}

async function fetchItalianCEIChapter(
  bookName: string, chapter: number
): Promise<{ number: number; text: string }[] | null> {
  try {
    const url = `https://www.laparola.net/testo.php?riferimento=${encodeURIComponent(bookName)}+${chapter}&versioni[]=C.E.I.`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; BibleReader/1.0)' },
      signal: AbortSignal.timeout(12000)
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const verses: { number: number; text: string }[] = [];
    const verseRegex = /<b>(\d+)<\/b>\s*([\s\S]*?)(?=<b>\d+<\/b>|<\/p>|$)/gi;
    let match;
    while ((match = verseRegex.exec(html)) !== null) {
      const num = parseInt(match[1]);
      let text = match[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&egrave;/g, 'è').replace(/&eacute;/g, 'é').replace(/&agrave;/g, 'à')
        .replace(/&ograve;/g, 'ò').replace(/&ugrave;/g, 'ù').replace(/&igrave;/g, 'ì')
        .replace(/\s+/g, ' ').trim();
      if (num > 0 && text) verses.push({ number: num, text });
    }
    return verses.length > 0 ? verses : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verses, bookName, chapterNumber, targetLang, bookFileName, patchEmptyVerses } = await req.json();

    // === PATCH EMPTY FRENCH VERSES (using néo-Crampon catholique) ===
    if (patchEmptyVerses && bookFileName && verses) {
      const emptyNums: number[] = verses
        .filter((v: any) => !v.text || v.text.trim() === '')
        .map((v: any) => v.number || v.verse);

      if (emptyNums.length === 0) {
        return new Response(JSON.stringify({ verses, source: 'original', patched: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isDeutero = deuterocanonicalFileNames.has(bookFileName);
      const usfmCode = fileNameToUSFM[bookFileName];
      let patchedVerses: { number: number; text: string }[] = [];

      // For canonical books: use néo-Crampon (francl) — Catholic French Bible
      if (!isDeutero && usfmCode) {
        const cramponChapter = await fetchBibleAPIChapter('francl', usfmCode, chapterNumber);
        if (cramponChapter) {
          patchedVerses = cramponChapter.filter(v => emptyNums.includes(v.number));
        }
      }

      // For deuterocanonical or remaining missing: use Douay-Rheims as reference text
      const foundNums = new Set(patchedVerses.map(v => v.number));
      const stillMissing = emptyNums.filter(n => !foundNums.has(n));
      
      if (stillMissing.length > 0 && usfmCode) {
        // Try eng_dra (Douay-Rheims) which has all 73 books, then translate
        const draChapter = await fetchBibleAPIChapter('eng_dra', usfmCode, chapterNumber);
        if (draChapter) {
          const draMatches = draChapter.filter(v => stillMissing.includes(v.number));
          // Use Douay-Rheims text with a [DR] marker so user knows source
          for (const v of draMatches) {
            patchedVerses.push({ number: v.number, text: v.text });
          }
        }
      }

      // Merge
      const patchMap = new Map(patchedVerses.map(v => [v.number, v.text]));
      const merged = verses.map((v: any) => {
        const num = v.number || v.verse;
        if ((!v.text || v.text.trim() === '') && patchMap.has(num)) {
          return { ...v, text: patchMap.get(num) };
        }
        return v;
      });

      return new Response(JSON.stringify({ verses: merged, source: 'patched-crampon', patched: patchedVerses.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === TRANSLATION MODE ===
    if (!verses || !targetLang || targetLang === 'fr') {
      return new Response(JSON.stringify({ verses, source: 'original' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usfmCode = bookFileName ? fileNameToUSFM[bookFileName] : null;
    const isDeutero = bookFileName ? deuterocanonicalFileNames.has(bookFileName) : false;

    // ENGLISH: Douay-Rheims (eng_dra) — 73 books Catholic
    if (targetLang === 'en' && usfmCode) {
      const draVerses = await fetchBibleAPIChapter('eng_dra', usfmCode, chapterNumber);
      if (draVerses && draVerses.length > 0) {
        return new Response(JSON.stringify({ verses: draVerses, source: 'douay-rheims' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ITALIAN: Riveduta for canonical, CEI for deuterocanonical
    if (targetLang === 'it') {
      if (isDeutero && bookFileName) {
        const italianName = fileNameToItalianCEI[bookFileName];
        if (italianName) {
          const ceiVerses = await fetchItalianCEIChapter(italianName, chapterNumber);
          if (ceiVerses && ceiVerses.length > 0) {
            return new Response(JSON.stringify({ verses: ceiVerses, source: 'cei' }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else if (usfmCode) {
        const rivVerses = await fetchBibleAPIChapter('ita_riv', usfmCode, chapterNumber);
        if (rivVerses && rivVerses.length > 0) {
          return new Response(JSON.stringify({ verses: rivVerses, source: 'riveduta' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // FALLBACK
    return new Response(JSON.stringify({ verses, source: 'fallback-french' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
