/**
 * Formatting helpers for neuvaine texts extracted from PDFs.
 * The source text often arrives as one long blob where headings,
 * numbered steps and litany invocations are collapsed into a single
 * paragraph. These helpers restore a readable liturgical structure.
 */

export type ProseBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

const HEADING_PATTERNS: RegExp[] = [
  /Qui est [^?.]{2,70}\?/,
  /Pourquoi [^?.]{2,90}\?/,
  /Comment prier cette neuvaine/,
  /Comment prier/,
  /Déroulement de chaque jour/,
  /Déroulement de la neuvaine/,
  /Structure de la neuvaine/,
  /Avant de commencer/,
  /Intentions? de la neuvaine/,
  /Clôture solennelle de la neuvaine/,
  /Pour qui prier/,
];

const SENTENCES_PER_PARAGRAPH = 3;

/** Split a long text into sentence-grouped paragraphs. */
const toParagraphs = (text: string): ProseBlock[] => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…]+[.!?…]+["»]?|\S+$/g) ?? [clean];
  const blocks: ProseBlock[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    const chunk = sentences
      .slice(i, i + SENTENCES_PER_PARAGRAPH)
      .join(' ')
      .trim();
    if (chunk) blocks.push({ kind: 'paragraph', text: chunk });
  }
  return blocks;
};

/** Extract a "1. … 2. … 3. …" run as a proper list when present. */
const extractNumberedList = (text: string): { before: string; items: string[]; after: string } | null => {
  const matches = [...text.matchAll(/(?:^|\s)(\d{1,2})\.\s+/g)];
  if (matches.length < 3) return null;
  // keep only a strictly increasing run starting at 1
  const run: RegExpMatchArray[] = [];
  let expected = 1;
  for (const m of matches) {
    if (Number(m[1]) === expected) {
      run.push(m);
      expected += 1;
    }
  }
  if (run.length < 3) return null;

  const start = run[0].index ?? 0;
  const before = text.slice(0, start).trim();
  const items: string[] = [];
  for (let i = 0; i < run.length; i += 1) {
    const from = (run[i].index ?? 0) + run[i][0].length;
    const to = i + 1 < run.length ? run[i + 1].index ?? text.length : text.length;
    items.push(text.slice(from, to).replace(/\s+/g, ' ').trim());
  }
  return { before, items, after: '' };
};

/** Turn raw neuvaine prose into structured, readable blocks. */
export const formatProse = (raw?: string | null): ProseBlock[] => {
  if (!raw) return [];
  const blocks: ProseBlock[] = [];

  const segments = raw
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    // 1. isolate numbered steps
    const list = extractNumberedList(segment);
    const prosePart = list ? list.before : segment;

    // 2. cut headings out of the prose part
    let rest = prosePart.replace(/\s+/g, ' ').trim();
    while (rest) {
      let bestIndex = -1;
      let bestMatch = '';
      for (const pattern of HEADING_PATTERNS) {
        const m = rest.match(pattern);
        if (m && m.index !== undefined && (bestIndex === -1 || m.index < bestIndex)) {
          bestIndex = m.index;
          bestMatch = m[0];
        }
      }
      if (bestIndex === -1) {
        blocks.push(...toParagraphs(rest));
        break;
      }
      const before = rest.slice(0, bestIndex).trim();
      if (before) blocks.push(...toParagraphs(before));
      blocks.push({ kind: 'heading', text: bestMatch.trim() });
      rest = rest.slice(bestIndex + bestMatch.length).trim();
    }

    if (list) blocks.push({ kind: 'list', items: list.items });
  }

  return blocks;
};

export type LitanyLine =
  | { kind: 'caption'; text: string }
  | { kind: 'invocation'; call: string; response: string }
  | { kind: 'versicle'; marker: string; text: string }
  | { kind: 'prayerHeading'; text: string }
  | { kind: 'prayer'; text: string };

const RESPONSES = [
  'ayez pitié de nous, Seigneur.',
  'pardonnez-nous, Seigneur.',
  'exaucez-nous, Seigneur.',
  'ayez pitié de nous.',
  'priez pour nous.',
  'prie pour nous.',
  'priez pour eux.',
  'écoutez-nous.',
  'exaucez-nous.',
  'délivrez-nous, Seigneur.',
  'sauvez-nous, Seigneur.',
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RESPONSE_RE = new RegExp(`(${RESPONSES.map(escape).join('|')})`, 'gi');

/** Parse a collapsed litany blob into invocation / response couplets. */
export const formatLitany = (raw?: string | null): LitanyLine[] => {
  if (!raw) return [];
  const lines: LitanyLine[] = [];

  // The final oration ("PRIONS …") is prose, keep it apart.
  const prionsIdx = raw.search(/\bPRIONS\b/);
  const body = (prionsIdx >= 0 ? raw.slice(0, prionsIdx) : raw).replace(/\s+/g, ' ').trim();
  const oration = prionsIdx >= 0 ? raw.slice(prionsIdx).replace(/\bPRIONS\b/, '').replace(/\s+/g, ' ').trim() : '';

  let cursor = 0;
  let match: RegExpExecArray | null;
  RESPONSE_RE.lastIndex = 0;
  while ((match = RESPONSE_RE.exec(body)) !== null) {
    const call = body.slice(cursor, match.index).trim();
    cursor = match.index + match[0].length;
    if (!call) continue;

    // Versicle / response markers ("V. … R. …")
    if (/^[VR]\.\s/.test(call)) {
      pushVersicles(lines, `${call} ${match[0]}`);
      continue;
    }

    // Everything before the very first liturgical invocation is a title/caption.
    if (lines.length === 0 && call.length > 40) {
      const opener = call.match(/(Seigneur|Christ|Kyrie|Dieu|Notre-Dame|Saint|Sainte|Vierge|Jésus)[^,]*,?$/);
      if (opener && opener.index !== undefined && opener.index > 20) {
        lines.push({ kind: 'caption', text: call.slice(0, opener.index).trim() });
        lines.push({ kind: 'invocation', call: call.slice(opener.index).trim(), response: match[0].trim() });
        continue;
      }
    }

    lines.push({ kind: 'invocation', call, response: match[0].trim() });
  }

  const tail = body.slice(cursor).trim();
  if (tail) {
    if (/(^|\s)[VR]\.\s/.test(tail)) pushVersicles(lines, tail);
    else lines.push({ kind: 'prayer', text: tail });
  }

  if (oration) {
    lines.push({ kind: 'prayerHeading', text: 'Prions' });
    lines.push({ kind: 'prayer', text: oration });
  }

  return lines;
};

/** Split a "V. … R. …" run into individual versicle lines. */
function pushVersicles(lines: LitanyLine[], text: string) {
  const parts = text.split(/(?=(?:^|\s)[VR]\.\s)/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([VR])\.\s*(.*)$/);
    if (m) lines.push({ kind: 'versicle', marker: m[1], text: m[2].trim() });
    else lines.push({ kind: 'prayer', text: part });
  }
}