import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { format, addDays, subDays, nextSunday, isToday } from 'date-fns';
import { fr, enUS, it } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, RefreshCw, WifiOff, AlertCircle, ArrowLeft, MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AelfLecture {
  type?: string; titre?: string; ref?: string; intro_lue?: string;
  contenu?: string; refrain?: string; refrain_psalmique?: string; verset_evangile?: string;
}
interface AelfMesse { nom?: string; lectures: AelfLecture[]; }
interface AelfInfo  { jour_liturgique_nom?: string; couleur?: string; }
interface Part      { id: string; label: string; kind: 'lecture'|'partie'; data: AelfLecture|Record<string,unknown>; }
interface PartGroup { id: string; label: string; options: Part[]; }

// ─── Constants ────────────────────────────────────────────────────────────────
const AELF   = 'https://api.aelf.org/v1';
const EN_API = 'https://cpbjr.github.io/catholic-readings-api';

// Only valid AELF zone identifiers
const ZONES = [
  { value:'romain',         label:'Romain'        },
  { value:'france',         label:'France'        },
  { value:'belgique',       label:'Belgique'      },
  { value:'canada-french',  label:'Canada'        },
  { value:'suisse',         label:'Suisse'        },
  { value:'luxembourg',     label:'Lux.'          },
  { value:'monaco',         label:'Monaco'        },
  { value:'algerie',        label:'Algérie'       },
  { value:'senegal',        label:'Sénégal'       },
  { value:'cote-d-ivoire',  label:"Côte d'Iv."   },
];
const VALID_ZONES = new Set(ZONES.map(z => z.value));

// Canonical liturgical hours order
const TABS = [
  { id:'messes'   },
  { id:'laudes'   },
  { id:'tierce'   },
  { id:'sexte'    },
  { id:'none'     },
  { id:'vepres'   },
  { id:'complies' },
  { id:'lectures' },
] as const;
type TabId = typeof TABS[number]['id'];

const CL: Record<string,{bg:string;text:string;pill:string}> = {
  rouge:  {bg:'bg-red-600',    text:'text-red-400',    pill:'bg-red-600/15 text-red-300'},
  vert:   {bg:'bg-emerald-600',text:'text-emerald-400',pill:'bg-emerald-600/15 text-emerald-300'},
  violet: {bg:'bg-violet-600', text:'text-violet-400', pill:'bg-violet-600/15 text-violet-300'},
  blanc:  {bg:'bg-amber-200',  text:'text-amber-200',  pill:'bg-amber-200/10 text-amber-200'},
  or:     {bg:'bg-yellow-500', text:'text-yellow-400', pill:'bg-yellow-500/15 text-yellow-300'},
  rose:   {bg:'bg-pink-500',   text:'text-pink-400',   pill:'bg-pink-500/15 text-pink-300'},
  noir:   {bg:'bg-zinc-600',   text:'text-zinc-400',   pill:'bg-zinc-600/15 text-zinc-300'},
};

const CARD_CFG: Record<TabId,{from:string;border:string;accent:string;bg:string;time:string}> = {
  messes:   {from:'from-amber-500/[0.15]', border:'border-amber-500/25',  accent:'text-amber-300',  bg:'bg-amber-500/8',   time:''},
  laudes:   {from:'from-orange-400/[0.15]',border:'border-orange-400/25', accent:'text-orange-300', bg:'bg-orange-400/8',  time:'6–9h'},
  tierce:   {from:'from-sky-500/[0.15]',   border:'border-sky-500/25',    accent:'text-sky-300',    bg:'bg-sky-500/8',     time:'9h'},
  sexte:    {from:'from-yellow-500/[0.15]',border:'border-yellow-500/25', accent:'text-yellow-300', bg:'bg-yellow-500/8',  time:'12h'},
  none:     {from:'from-rose-500/[0.15]',  border:'border-rose-500/25',   accent:'text-rose-300',   bg:'bg-rose-500/8',    time:'15h'},
  vepres:   {from:'from-violet-500/[0.15]',border:'border-violet-500/25', accent:'text-violet-300', bg:'bg-violet-500/8',  time:'18h'},
  complies: {from:'from-blue-600/[0.15]',  border:'border-blue-600/25',   accent:'text-blue-300',   bg:'bg-blue-600/8',    time:'21h'},
  lectures: {from:'from-teal-500/[0.15]',  border:'border-teal-500/25',   accent:'text-teal-300',   bg:'bg-teal-500/8',    time:''},
};

// ─── i18n ─────────────────────────────────────────────────────────────────────
type Lang = 'fr'|'en'|'it';
const I18N = {
  fr:{
    groups:{
      messes:   {label:'Messe',               desc:'Lectures du jour',  time:'',     emoji:'✝️'},
      laudes:   {label:'Laudes',              desc:'Prière du matin',   time:'6–9h', emoji:'🌅'},
      tierce:   {label:'Tierce',              desc:'Heure interméd.',   time:'9h',   emoji:'🕘'},
      sexte:    {label:'Sexte',               desc:'Heure de midi',     time:'12h',  emoji:'☀️'},
      none:     {label:'None',                desc:"Heure de l'ap-m.",  time:'15h',  emoji:'🕒'},
      vepres:   {label:'Vêpres',              desc:'Prière du soir',    time:'18h',  emoji:'🌇'},
      complies: {label:'Complies',            desc:'Prière de nuit',    time:'21h',  emoji:'🌙'},
      lectures: {label:'Office des lectures', desc:'Vigiles',           time:'',     emoji:'📖'},
    } as Record<TabId,{label:string;desc:string;time:string;emoji:string}>,
    lec:{
      lecture_1:'1ʳᵉ lecture', lecture_2:'2ᵉ lecture', psaume:'Psaume',
      sequence:'Séquence', evangile:'Évangile', verset_evangile:'Alléluia',
    },
    ui:{
      back:'Retour', today:"Aujourd'hui", hier:'Hier', demain:'Demain', nextSun:'Dim. prochain',
      noText:'Aucun texte disponible.', retry:'Réessayer', choice:'Lectures au choix',
      offline:'Hors ligne', offlineD:'Reconnectez-vous.',
      unavail:'Textes indisponibles', unavailD:'Non disponibles pour cette date.',
    },
  },
  en:{
    groups:{
      messes:   {label:'Mass',               desc:'Daily readings',    time:'',      emoji:'✝️'},
      laudes:   {label:'Lauds',              desc:'Morning prayer',    time:'6–9AM', emoji:'🌅'},
      tierce:   {label:'Terce',              desc:'Middle hour',       time:'9AM',   emoji:'🕘'},
      sexte:    {label:'Sext',               desc:'Midday hour',       time:'12PM',  emoji:'☀️'},
      none:     {label:'None',               desc:'Afternoon hour',    time:'3PM',   emoji:'🕒'},
      vepres:   {label:'Vespers',            desc:'Evening prayer',    time:'6PM',   emoji:'🌇'},
      complies: {label:'Compline',           desc:'Night prayer',      time:'9PM',   emoji:'🌙'},
      lectures: {label:'Office of Readings', desc:'Vigils',            time:'',      emoji:'📖'},
    } as Record<TabId,{label:string;desc:string;time:string;emoji:string}>,
    lec:{
      lecture_1:'1st reading', lecture_2:'2nd reading', psaume:'Psalm',
      sequence:'Sequence', evangile:'Gospel', verset_evangile:'Alleluia',
    },
    ui:{
      back:'Back', today:'Today', hier:'Yesterday', demain:'Tomorrow', nextSun:'Next Sunday',
      noText:'No text available.', retry:'Retry', choice:'Readings at choice',
      offline:'You are offline', offlineD:'Reconnect to access texts.',
      unavail:'Texts unavailable', unavailD:'Not available for this date.',
    },
  },
  it:{
    groups:{
      messes:   {label:'Messa',               desc:'Testi del giorno',  time:'',     emoji:'✝️'},
      laudes:   {label:'Lodi',                desc:'Preghiera mattino', time:'6–9h', emoji:'🌅'},
      tierce:   {label:'Terza',               desc:'Ora intermedia',    time:'9h',   emoji:'🕘'},
      sexte:    {label:'Sesta',               desc:'Ora di mezzogiorno',time:'12h',  emoji:'☀️'},
      none:     {label:'Nona',                desc:'Ora del pomeriggio',time:'15h',  emoji:'🕒'},
      vepres:   {label:'Vespri',              desc:'Preghiera sera',    time:'18h',  emoji:'🌇'},
      complies: {label:'Compieta',            desc:'Preghiera notte',   time:'21h',  emoji:'🌙'},
      lectures: {label:'Ufficio lett.',        desc:'Vigilie',           time:'',     emoji:'📖'},
    } as Record<TabId,{label:string;desc:string;time:string;emoji:string}>,
    lec:{
      lecture_1:'1ª lettura', lecture_2:'2ª lettura', psaume:'Salmo',
      sequence:'Sequenza', evangile:'Vangelo', verset_evangile:'Alleluia',
    },
    ui:{
      back:'Indietro', today:'Oggi', hier:'Ieri', demain:'Domani', nextSun:'Dom. prossima',
      noText:'Nessun testo disponibile.', retry:'Riprova', choice:'Letture a scelta',
      offline:'Sei offline', offlineD:'Riconnettiti.',
      unavail:'Testi non disponibili', unavailD:'Non disponibili per questa data.',
    },
  },
} as const;

function getLang(l:string): Lang { return l==='en'?'en':l==='it'?'it':'fr'; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Europe/Paris')                    return 'france';
    if (tz === 'Europe/Brussels')                 return 'belgique';
    if (/^America\/(Toronto|Montreal|Halifax|Vancouver|Winnipeg)/i.test(tz)) return 'canada-french';
    if (/Europe\/(Zurich|Bern)/i.test(tz))       return 'suisse';
    if (tz === 'Europe/Luxembourg')               return 'luxembourg';
    if (tz === 'Europe/Monaco')                   return 'monaco';
    if (/^Africa\/Abidjan/i.test(tz))             return 'cote-d-ivoire';
    if (/^Africa\/Dakar/i.test(tz))              return 'senegal';
  } catch {/**/ }
  return 'romain';
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

async function fetchAelf(tab: TabId, date: string, zone: string) {
  const url = tab === 'messes'
    ? `${AELF}/messes/${date}/${zone}`
    : `${AELF}/offices/${tab}/${date}/${zone}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(14000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<Record<string, unknown>>;
}

async function fetchEnglish(date: string) {
  const [y, m, d] = date.split('-');
  const r = await fetch(`${EN_API}/readings/${y}/${m}-${d}.json`, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(String(r.status));
  const raw = await r.json() as Record<string, unknown>;
  type R = Record<string, unknown>;
  const raws = ((raw.readings ?? raw.mass_readings ?? []) as R[]);
  const lectures: AelfLecture[] = raws.map((rd: R, i: number) => {
    const name = String(rd.name ?? rd.title ?? '').toLowerCase();
    let type = `lecture_${i + 1}`;
    if (/gospel/i.test(name))                   type = 'evangile';
    else if (/psalm|responsorial/i.test(name))  type = 'psaume';
    else if (/alleluia/i.test(name))            type = 'verset_evangile';
    else if (i === 0)                           type = 'lecture_1';
    else if (i === 1)                           type = 'lecture_2';
    return {
      type, titre: String(rd.name ?? rd.title ?? ''), ref: String(rd.citation ?? rd.reference ?? ''),
      contenu: String(rd.text ?? rd.content ?? '').replace(/\n/g, '<br/>'),
      refrain_psalmique: rd.refrain ? String(rd.refrain) : undefined,
    };
  });
  return {
    informations: {
      jour_liturgique_nom: String(raw.celebration ?? raw.feast ?? ''),
      couleur: String(raw.color ?? '').toLowerCase(),
    },
    messes: [{ nom: '', lectures }],
  } as Record<string, unknown>;
}

function groupParts(parts: Part[]): PartGroup[] {
  const g: PartGroup[] = [];
  for (const p of parts) {
    const last = g[g.length - 1];
    if (last && last.label === p.label && last.options[0].kind === p.kind) last.options.push(p);
    else g.push({ id: p.id, label: p.label, options: [p] });
  }
  return g;
}

function extractParts(data: unknown, tab: TabId, mi: number, lec: Record<string, string>): Part[] {
  const d = data as Record<string, unknown>;
  if (tab === 'messes') {
    const messes = (d?.messes as AelfMesse[]) || [];
    if (!messes.length) return [];
    const m = messes[Math.min(mi, messes.length - 1)];
    return (m?.lectures || [])
      .filter((l: AelfLecture) => l.contenu || l.verset_evangile)
      .map((l: AelfLecture, i: number) => ({
        id: `${l.type ?? 'x'}_${i}`,
        label: lec[l.type ?? ''] || (l.type ?? '').replace(/_/g, ' '),
        kind: 'lecture' as const,
        data: l,
      }));
  }
  let office = d?.[tab] as Record<string, unknown> | undefined;
  if (!office || typeof office !== 'object') {
    const fallback = Object.keys(d || {}).find(
      k => k !== 'informations' && typeof d[k] === 'object' && d[k] !== null
    );
    if (fallback) office = d[fallback] as Record<string, unknown>;
  }
  if (!office) return [];
  const parts: Part[] = [];
  const lecs = ((office.lectures ?? office.lecture ?? []) as AelfLecture[]);
  lecs.forEach((l, i) => {
    if (l.contenu || l.verset_evangile)
      parts.push({
        id: `lec_${i}`,
        label: lec[l.type ?? ''] || (l.type ?? '').replace(/_/g, ' ') || String(i + 1),
        kind: 'lecture', data: l,
      });
  });
  const pars = ((office.parties ?? office.partie ?? []) as Record<string, unknown>[]);
  pars.forEach((p, i) => {
    if (p.contenu)
      parts.push({
        id: `part_${i}`,
        label: (p.titre as string) || ((p.type as string) || '').replace(/_/g, ' ') || String(i + 1),
        kind: 'partie', data: p,
      });
  });
  return parts;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Lecture({ lec, label }: { lec: AelfLecture; label: string }) {
  const isEvangile = (lec.type ?? '').includes('evangile') && lec.type !== 'verset_evangile';
  const isPsaume   = lec.type === 'psaume';
  const isVerset   = lec.type === 'verset_evangile';
  const refrain    = lec.refrain_psalmique || lec.refrain;
  if (isVerset && !lec.contenu && !lec.verset_evangile) return null;
  return (
    <div className="pb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <span className={cn('text-[10px] font-black uppercase tracking-[0.25em]',
          isEvangile ? 'text-amber-400' : isPsaume ? 'text-blue-400' : 'text-white/40')}>
          {isEvangile && <span className="mr-1">✝</span>}{label}
        </span>
        {lec.ref && <span className="text-xs text-white/50 italic truncate">{lec.ref}</span>}
      </div>
      {lec.titre && lec.titre !== lec.ref && (
        <p className="text-[13px] text-white/40 italic mb-3 -mt-1">{lec.titre}</p>
      )}

      {/* Alleluia / verse */}
      {isVerset && (
        <div className="border-l-2 border-amber-500/50 pl-4 py-0.5">
          <p className="text-[15px] italic text-amber-100/85 leading-[1.8]">
            {lec.verset_evangile
              ? <span dangerouslySetInnerHTML={{ __html: lec.verset_evangile }} />
              : <span dangerouslySetInnerHTML={{ __html: lec.contenu || '' }} />}
          </p>
        </div>
      )}

      {/* Psalm */}
      {isPsaume && (
        <div>
          {refrain && (
            <div className="bg-blue-950/50 border border-blue-500/20 rounded-xl px-4 py-3 mb-4">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400/70 block mb-1.5">R/</span>
              <div className="text-[15px] text-blue-100/95 leading-[1.75] italic font-medium [&_p]:mb-1 [&_p:last-child]:mb-0 [&_span]:inline"
                dangerouslySetInnerHTML={{ __html: refrain }} />
            </div>
          )}
          {lec.contenu && (
            <div className="psalm-text text-[14px] leading-[1.9] text-white/80"
              dangerouslySetInnerHTML={{ __html: lec.contenu }} />
          )}
          {refrain && (
            <div className="flex items-start gap-1 text-[12px] text-blue-300/40 italic mt-3 pl-3 border-l border-blue-500/20 [&_p]:inline [&_span]:inline">
              <span className="flex-shrink-0">R/</span>
              <span dangerouslySetInnerHTML={{ __html: refrain }} />
            </div>
          )}
        </div>
      )}

      {/* Reading / Gospel */}
      {!isPsaume && !isVerset && (
        <>
          {lec.intro_lue && <p className="text-[12px] text-white/35 italic mb-3">{lec.intro_lue}</p>}
          {lec.contenu && (
            <div className={cn('reading-text leading-[1.9]', isEvangile ? 'text-[16px] text-white/95' : 'text-[15px] text-white/82')}
              dangerouslySetInnerHTML={{ __html: lec.contenu }} />
          )}
        </>
      )}
    </div>
  );
}

function OfficeBlock({ partie }: { partie: Record<string, unknown> }) {
  const label = (partie.titre as string) || (partie.type as string) || '';
  if (!partie.contenu) return null;
  return (
    <div className="pb-8">
      {label && (
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">{label}</span>
          {(partie.ref as string) && <span className="text-xs text-white/30 italic">{partie.ref as string}</span>}
        </div>
      )}
      {partie.antienne && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 mb-4">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/35 block mb-1.5">Ant.</span>
          <p className="text-[14px] italic text-white/80 leading-[1.75]">{partie.antienne as string}</p>
        </div>
      )}
      <div className="reading-text text-[15px] leading-[1.9] text-white/82"
        dangerouslySetInnerHTML={{ __html: partie.contenu as string }} />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 pt-2">
      <div className="h-2 w-16 bg-white/10 rounded-full" />
      <div className="h-4 w-40 bg-white/8 rounded-full" />
      <div className="h-px bg-white/6 w-full mt-2" />
      {[100, 88, 95, 70, 85, 92, 60, 78].map((w, i) => (
        <div key={i} className="h-3 bg-white/[0.05] rounded-full" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MesseOffice() {
  const { i18n } = useTranslation();
  const lang   = getLang(i18n.language?.substring(0, 2) ?? 'fr');
  const L      = I18N[lang];
  const locale = lang === 'fr' ? fr : lang === 'it' ? it : enUS;

  const [date,    setDate]    = useState(() => new Date());
  const [zone,    setZone]    = useState(() => {
    const saved = localStorage.getItem('liturgical_zone') ?? detectZone();
    if (saved === 'afrique') return 'romain'; // migrate old value
    return VALID_ZONES.has(saved) ? saved : 'romain';
  });
  const [view,    setView]    = useState<'overview'|'content'>('overview');
  const [tab,     setTab]     = useState<TabId>('messes');
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error,   setError]   = useState(false);
  const [data,    setData]    = useState<unknown>(null);
  const [name,    setName]    = useState('');
  const [color,   setColor]   = useState('');
  const [mi,      setMi]      = useState(0);
  const [parts,   setParts]   = useState<Part[]>([]);
  const [selId,   setSelId]   = useState<string|null>(null);
  const [optIdx,  setOptIdx]  = useState<Record<string,number>>({});
  const [sumColor,setSumColor]= useState('');
  const [sumName, setSumName] = useState('');
  const [calOpen, setCalOpen] = useState(false);

  const abortRef  = useRef<AbortController|null>(null);
  const sumAbort  = useRef<AbortController|null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateStr   = fmt(date);

  const groups   = groupParts(parts);
  const selGroup = groups.find(g => g.id === selId);
  const selOpt   = selGroup ? (optIdx[selGroup.id] ?? 0) : 0;
  const selPart  = selGroup?.options[selOpt] ?? null;
  const dispColor = view === 'content' ? color : sumColor;
  const dispName  = view === 'content' ? name  : sumName;
  const cl        = dispColor ? CL[dispColor] : null;
  const messes    = ((data as Record<string,unknown>)?.messes as AelfMesse[]) ?? [];
  const cardCfg   = CARD_CFG[tab];

  // Summary fetch for overview feast name
  useEffect(() => {
    sumAbort.current?.abort();
    const ctrl = new AbortController();
    sumAbort.current = ctrl;
    setSumName(''); setSumColor('');
    (async () => {
      try {
        const r = await fetch(`${AELF}/messes/${dateStr}/${zone}`, { signal: AbortSignal.timeout(8000) });
        if (!r.ok || ctrl.signal.aborted) return;
        const j = await r.json() as { informations?: AelfInfo };
        if (ctrl.signal.aborted) return;
        setSumName(j?.informations?.jour_liturgique_nom ?? '');
        setSumColor(j?.informations?.couleur?.toLowerCase() ?? '');
      } catch { /**/ }
    })();
    return () => ctrl.abort();
  }, [dateStr, zone]);

  const load = useCallback(async (d: string, z: string, t: TabId) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(false); setOffline(false);
    setData(null); setParts([]); setSelId(null); setOptIdx({});
    try {
      let result: Record<string,unknown>;
      if (lang === 'en' && t === 'messes') {
        try { result = await fetchEnglish(d); } catch { result = await fetchAelf(t, d, z); }
      } else {
        result = await fetchAelf(t, d, z);
      }
      if (ctrl.signal.aborted) return;
      setName(result?.informations ? (result.informations as AelfInfo).jour_liturgique_nom ?? '' : '');
      setColor(result?.informations ? (result.informations as AelfInfo).couleur?.toLowerCase() ?? '' : '');
      setData(result);
    } catch {
      if (ctrl.signal.aborted) return;
      if (!navigator.onLine) setOffline(true); else setError(true);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [lang]);

  // Load data when entering content view
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (view === 'content') { setMi(0); load(dateStr, zone, tab); } }, [view, tab, dateStr, zone]);

  // Extract parts from loaded data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data || loading) return;
    const ex = extractParts(data, tab, mi, L.lec);
    setParts(ex);
    setSelId(groupParts(ex)[0]?.id ?? null);
  }, [data, tab, mi, lang, loading]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!selId || !scrollRef.current) return;
    scrollRef.current.querySelector(`[data-g="${selId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selId]);

  const changeZone = (z: string) => { setZone(z); localStorage.setItem('liturgical_zone', z); };
  const goDate = (d: Date) => { setDate(d); setName(''); setColor(''); setCalOpen(false); };
  const openTab = (t: TabId) => { setTab(t); setView('content'); };
  const goBack  = () => { setView('overview'); abortRef.current?.abort(); };

  const shortcuts = [
    { label: L.ui.hier,    fn: () => goDate(subDays(new Date(), 1)) },
    { label: L.ui.today,   fn: () => goDate(new Date()) },
    { label: L.ui.demain,  fn: () => goDate(addDays(new Date(), 1)) },
    { label: L.ui.nextSun, fn: () => goDate(nextSunday(new Date())) },
  ];

  const activeBtn = cn('text-white shadow-sm', cl ? cl.bg : 'bg-primary');
  const inactBtn  = 'bg-white/[0.06] text-white/50 border border-white/[0.08] hover:bg-white/10 hover:text-white/80';

  function renderContent() {
    if (loading || (data && parts.length === 0 && !error && !offline)) return <Skeleton />;
    if (offline) return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <WifiOff className="w-8 h-8 text-white/20" />
        <p className="text-sm font-medium text-white/60">{L.ui.offline}</p>
        <p className="text-xs text-white/35">{L.ui.offlineD}</p>
      </div>
    );
    if (error) return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-white/20" />
        <p className="text-sm font-medium text-white/60">{L.ui.unavail}</p>
        <p className="text-xs text-white/35">{L.ui.unavailD}</p>
        <button onClick={() => load(dateStr, zone, tab)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 mt-1">
          <RefreshCw className="w-3 h-3" />{L.ui.retry}
        </button>
      </div>
    );
    if (!selPart) return (
      <div className="py-16 text-center">
        <p className="text-sm text-white/35">{L.ui.noText}</p>
      </div>
    );
    if (selPart.kind === 'lecture') return <Lecture lec={selPart.data as AelfLecture} label={selPart.label} />;
    return <OfficeBlock partie={selPart.data as Record<string,unknown>} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#0c0c10] text-white">
      <Helmet>
        <title>
          {view === 'content'
            ? `${L.groups[tab].label} — ${format(date, 'd MMM', { locale })}`
            : `Liturgie — ${format(date, 'd MMM yyyy', { locale })}`}
        </title>
        <style>{`
          .reading-text p, .psalm-text p { margin-bottom: .9em; }
          .reading-text p:last-child, .psalm-text p:last-child { margin-bottom: 0; }
          .reading-text strong, .reading-text b { color: hsl(var(--primary)); font-weight: 600; }
          .reading-text em, .reading-text i, .psalm-text em { color: rgba(255,255,255,.5); }
          .psalm-text p { padding-left: .4rem; border-left: 2px solid rgba(255,255,255,.06); }
        `}</style>
      </Helmet>

      <Navigation />

      {/* ── Area below fixed Navigation ── */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ paddingTop: '4rem' }}>

        {/* ════ STICKY HEADER — never scrolls ════ */}
        <div className="flex-shrink-0 bg-[#0c0c10] z-10">

          {/* Colour strip */}
          <AnimatePresence>
            {dispColor && cl && (
              <motion.div key={dispColor} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: .35 }} className={cn('h-0.5 w-full origin-left', cl.bg)} />
            )}
          </AnimatePresence>

          {/* ── Date bar: controls LEFT, zone RIGHT ── */}
          <div className="flex items-center px-3 py-1.5 gap-0.5 border-b border-white/[0.07]">
            {/* Prev */}
            <button onClick={() => goDate(subDays(date, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Date display — opens calendar */}
            <button onClick={() => setCalOpen(true)} className="flex items-center gap-1.5 py-0.5 group">
              <span className="text-[13px] text-white/40 capitalize">{format(date, 'EEEE', { locale })}</span>
              <span className="text-[15px] font-bold text-white group-hover:text-primary transition-colors">
                {format(date, 'd')}
              </span>
              <span className="text-[13px] text-white/60 capitalize">{format(date, 'MMMM yyyy', { locale })}</span>
              {isToday(date) && (
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', cl ? cl.pill : 'bg-primary/15 text-primary')}>
                  {L.ui.today}
                </span>
              )}
            </button>

            {/* Next */}
            <button onClick={() => goDate(addDays(date, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors flex-shrink-0">
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Spacer pushes zone to right */}
            <div className="flex-1" />

            {/* Zone selector */}
            <div className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 text-white/25 flex-shrink-0" />
              <Select value={zone} onValueChange={changeZone}>
                <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent text-white/35 hover:text-white/60 w-auto px-0 gap-0.5 focus:ring-0 max-w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[130px]">
                  {ZONES.map(z => <SelectItem key={z.value} value={z.value} className="text-xs">{z.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Feast name */}
          <div className="h-7 flex items-center justify-center px-4">
            <AnimatePresence mode="wait">
              {dispName ? (
                <motion.div key={dispName} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5">
                  {cl && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cl.bg)} />}
                  <p className={cn('text-[12px] italic font-medium', cl ? cl.text : 'text-white/45')}>{dispName}</p>
                </motion.div>
              ) : (
                <div className="h-3 w-44 bg-white/[0.06] rounded-full animate-pulse" />
              )}
            </AnimatePresence>
          </div>

          {/* Content-view bar: back + tabs (shown only in content mode) */}
          <AnimatePresence>
            {view === 'content' && (
              <motion.div key="content-bar"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: .15 }}
                className="border-t border-white/[0.05]">
                <div className="max-w-[660px] mx-auto px-3 sm:px-4">
                  {/* Back + title */}
                  <div className="flex items-center gap-2 pt-2 pb-1.5">
                    <button onClick={goBack}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/8 text-white/40 hover:text-white transition-colors flex-shrink-0">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-base leading-none">{L.groups[tab].emoji}</span>
                    <p className={cn('text-[13px] font-bold', cardCfg.accent)}>{L.groups[tab].label}</p>
                    {L.groups[tab].time && (
                      <span className="text-[10px] text-white/30 font-mono">{L.groups[tab].time}</span>
                    )}
                  </div>

                  {/* Mass selector */}
                  {tab === 'messes' && !loading && messes.length > 1 && (
                    <Select value={String(mi)} onValueChange={v => setMi(Number(v))}>
                      <SelectTrigger className="w-full text-sm bg-white/[0.04] border-white/[0.08] rounded-lg h-9 mb-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {messes.map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m.nom || `Messe ${i + 1}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Part tabs */}
                  {!loading && !error && !offline && groups.length > 0 && (
                    <div ref={scrollRef}
                      className="flex gap-1.5 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4"
                      style={{ scrollbarWidth: 'none' }}>
                      {groups.map(g => {
                        const active = selId === g.id;
                        const multi  = g.options.length > 1;
                        const oi     = optIdx[g.id] ?? 0;
                        if (multi) return (
                          <div key={g.id} data-g={g.id} className="flex-shrink-0 flex">
                            <button onClick={() => setSelId(g.id)}
                              className={cn('px-3 py-1.5 rounded-l-full text-[11px] font-medium transition-all whitespace-nowrap', active ? activeBtn : inactBtn)}>
                              {g.label}<span className="ml-1 opacity-60 text-[9px]">{String.fromCharCode(65 + oi)}</span>
                            </button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button onClick={() => setSelId(g.id)}
                                  className={cn('px-1.5 py-1.5 rounded-r-full text-[11px] transition-all border-l border-white/10', active ? activeBtn : inactBtn)}>
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1.5 rounded-xl border-white/10 bg-[#161620]" align="start">
                                <p className="text-[9px] uppercase tracking-widest text-white/30 px-2 py-1">{L.ui.choice}</p>
                                {g.options.map((op, i) => {
                                  const d = op.data as AelfLecture;
                                  return (
                                    <button key={op.id}
                                      onClick={() => { setOptIdx(p => ({ ...p, [g.id]: i })); setSelId(g.id); }}
                                      className={cn('w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors',
                                        (optIdx[g.id] ?? 0) === i ? 'bg-primary/15 text-primary' : 'hover:bg-white/6 text-white/60')}>
                                      <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span>
                                      {d.ref || d.titre || `Option ${i + 1}`}
                                    </button>
                                  );
                                })}
                              </PopoverContent>
                            </Popover>
                          </div>
                        );
                        return (
                          <button key={g.id} data-g={g.id} onClick={() => setSelId(g.id)}
                            className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap', active ? activeBtn : inactBtn)}>
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Divider */}
                  {!loading && !error && !offline && groups.length > 0 && (
                    <div className="h-px bg-white/[0.07]" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ════ SCROLLABLE CONTENT ════ */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[660px] mx-auto px-3 sm:px-4 pb-24">
            <AnimatePresence mode="wait">

              {/* Overview grid */}
              {view === 'overview' && (
                <motion.div key="ov"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: .14 }}>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {TABS.map((t, i) => {
                      const info = L.groups[t.id];
                      const cfg  = CARD_CFG[t.id];
                      return (
                        <motion.button key={t.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * .03, duration: .18 }} whileTap={{ scale: .97 }}
                          onClick={() => openTab(t.id)}
                          className={cn('relative overflow-hidden rounded-xl border text-left p-3 transition-all duration-150 group hover:brightness-110', cfg.bg, cfg.border)}>
                          <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent opacity-80 pointer-events-none', cfg.from)} />
                          <div className="relative flex items-start justify-between mb-2">
                            <span className="text-2xl leading-none">{info.emoji}</span>
                            {info.time && <span className="text-[10px] font-mono text-white/30">{info.time}</span>}
                          </div>
                          <p className={cn('relative text-[13px] font-bold leading-tight mb-0.5', cfg.accent)}>{info.label}</p>
                          <p className="relative text-[11px] text-white/40 leading-snug">{info.desc}</p>
                          <ChevronRight className="absolute right-2.5 bottom-2.5 w-3 h-3 text-white/15 group-hover:text-white/35 transition-colors" />
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Content view */}
              {view === 'content' && (
                <motion.div key="cv"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: .14 }} className="pt-4">
                  <AnimatePresence mode="wait">
                    <motion.div key={`${selId}-${selOpt}-${dateStr}-${mi}`}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: .12 }}>
                      {renderContent()}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Calendar Sheet ── */}
      <Sheet open={calOpen} onOpenChange={setCalOpen}>
        <SheetContent side="bottom" className="bg-[#111116] border-t border-white/10 pb-8 rounded-t-2xl">
          <div className="flex gap-2 flex-wrap py-3 border-b border-white/[0.07] mb-1">
            {shortcuts.map(({ label, fn }) => (
              <button key={label} onClick={fn}
                className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/10 text-white/55 hover:text-white transition-colors border border-white/[0.07] whitespace-nowrap">
                {label}
              </button>
            ))}
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d: Date | undefined) => d && goDate(d)}
            className="mx-auto pointer-events-auto"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
