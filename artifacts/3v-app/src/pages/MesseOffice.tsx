import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { format, addDays, subDays, nextSunday, isToday } from 'date-fns';
import { fr, enUS, it } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, RefreshCw, WifiOff, AlertCircle, ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AelfInformations {
  jour_liturgique_nom?: string;
  couleur?: string;
}
interface AelfLecture {
  type?: string;
  titre?: string;
  ref?: string;
  intro_lue?: string;
  contenu?: string;
  refrain?: string;
  verset_evangile?: string;
}
interface AelfMesse { nom?: string; lectures: AelfLecture[]; }
interface Part {
  id: string;
  label: string;
  kind: 'lecture' | 'partie';
  data: AelfLecture | Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LITURGY_API = 'https://api.aelf.org/v1';

const ZONES = [
  { value: 'afrique',    label: 'Afrique (Cameroun…)' },
  { value: 'france',     label: 'France' },
  { value: 'belgique',   label: 'Belgique' },
  { value: 'canada',     label: 'Canada' },
  { value: 'luxembourg', label: 'Luxembourg' },
  { value: 'suisse',     label: 'Suisse' },
  { value: 'monaco',     label: 'Monaco' },
  { value: 'romain',     label: 'Romain universel' },
];

const TABS = [
  { id: 'messes' },
  { id: 'laudes' },
  { id: 'vepres' },
  { id: 'complies' },
  { id: 'lectures' },
  { id: 'tierce' },
  { id: 'sexte' },
  { id: 'none' },
] as const;
type TabId = typeof TABS[number]['id'];

const COULEUR_CLASSES: Record<string, { bg: string; text: string }> = {
  rouge:  { bg: 'bg-red-600',    text: 'text-red-400' },
  vert:   { bg: 'bg-green-600',  text: 'text-green-400' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-400' },
  blanc:  { bg: 'bg-amber-200',  text: 'text-amber-200' },
  or:     { bg: 'bg-yellow-500', text: 'text-yellow-400' },
  rose:   { bg: 'bg-pink-500',   text: 'text-pink-400' },
  noir:   { bg: 'bg-gray-700',   text: 'text-gray-300' },
};

const CARD_STYLES: Record<TabId, { glow: string; border: string; accent: string; dot: string }> = {
  messes:   { glow: 'from-amber-600/20',  border: 'border-amber-700/30', accent: 'text-amber-300',  dot: 'bg-amber-500' },
  laudes:   { glow: 'from-orange-600/20', border: 'border-orange-700/30',accent: 'text-orange-300', dot: 'bg-orange-500' },
  vepres:   { glow: 'from-violet-600/20', border: 'border-violet-700/30',accent: 'text-violet-300', dot: 'bg-violet-500' },
  complies: { glow: 'from-blue-600/20',   border: 'border-blue-700/30',  accent: 'text-blue-300',   dot: 'bg-blue-500' },
  lectures: { glow: 'from-teal-600/20',   border: 'border-teal-700/30',  accent: 'text-teal-300',   dot: 'bg-teal-500' },
  tierce:   { glow: 'from-sky-600/20',    border: 'border-sky-700/30',   accent: 'text-sky-300',    dot: 'bg-sky-500' },
  sexte:    { glow: 'from-yellow-600/20', border: 'border-yellow-700/30',accent: 'text-yellow-300', dot: 'bg-yellow-500' },
  none:     { glow: 'from-rose-600/20',   border: 'border-rose-700/30',  accent: 'text-rose-300',   dot: 'bg-rose-500' },
};

// ─── i18n ─────────────────────────────────────────────────────────────────────
type Lang = 'fr' | 'en' | 'it';
interface GroupInfo { label: string; desc: string; time: string; emoji: string; }
interface UiLabels {
  back: string; today: string; yesterday: string; tomorrow: string; nextSunday: string;
  massSelect: string; noText: string; offline: string; offlineDesc: string;
  unavailable: string; unavailableDesc: string; retry: string;
}

const I18N: Record<Lang, { groups: Record<TabId, GroupInfo>; lectures: Record<string, string>; ui: UiLabels }> = {
  fr: {
    groups: {
      messes:   { label: 'Messe',               desc: 'Textes du jour',          time: '',      emoji: '✝️' },
      laudes:   { label: 'Laudes',              desc: 'Prière du matin',         time: '6h–9h', emoji: '🌅' },
      vepres:   { label: 'Vêpres',              desc: 'Prière du soir',          time: '18h',   emoji: '🌇' },
      complies: { label: 'Complies',            desc: 'Prière de nuit',          time: '21h',   emoji: '🌙' },
      lectures: { label: 'Office des lectures', desc: 'Vigiles',                 time: '',      emoji: '📖' },
      tierce:   { label: 'Tierce',              desc: 'Heure intermédiaire',     time: '9h',    emoji: '🕘' },
      sexte:    { label: 'Sexte',               desc: 'Heure de midi',           time: '12h',   emoji: '☀️' },
      none:     { label: 'None',                desc: "Heure de l'après-midi",   time: '15h',   emoji: '🕒' },
    },
    lectures: {
      lecture_1: '1ʳᵉ lecture', lecture_2: '2ᵉ lecture', psaume: 'Psaume',
      sequence: 'Séquence', evangile: 'Évangile', verset_evangile: 'Alléluia',
    },
    ui: {
      back: 'Retour', today: "Aujourd'hui", yesterday: 'Hier', tomorrow: 'Demain',
      nextSunday: 'Dim. prochain', massSelect: 'Choisir une messe',
      noText: 'Aucun texte disponible pour cette date.',
      offline: 'Vous êtes hors ligne',
      offlineDesc: 'Reconnectez-vous pour accéder aux textes liturgiques.',
      unavailable: 'Textes indisponibles',
      unavailableDesc: 'Les textes ne sont pas disponibles pour cette date ou zone.',
      retry: 'Réessayer',
    },
  },
  en: {
    groups: {
      messes:   { label: 'Mass',                desc: 'Daily texts',             time: '',       emoji: '✝️' },
      laudes:   { label: 'Lauds',               desc: 'Morning prayer',          time: '6–9 AM', emoji: '🌅' },
      vepres:   { label: 'Vespers',             desc: 'Evening prayer',          time: '6 PM',   emoji: '🌇' },
      complies: { label: 'Compline',            desc: 'Night prayer',            time: '9 PM',   emoji: '🌙' },
      lectures: { label: 'Office of Readings',  desc: 'Vigils',                  time: '',       emoji: '📖' },
      tierce:   { label: 'Terce',               desc: 'Middle hour',             time: '9 AM',   emoji: '🕘' },
      sexte:    { label: 'Sext',                desc: 'Midday hour',             time: '12 PM',  emoji: '☀️' },
      none:     { label: 'None',                desc: 'Afternoon hour',          time: '3 PM',   emoji: '🕒' },
    },
    lectures: {
      lecture_1: '1st reading', lecture_2: '2nd reading', psaume: 'Psalm',
      sequence: 'Sequence', evangile: 'Gospel', verset_evangile: 'Alleluia',
    },
    ui: {
      back: 'Back', today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow',
      nextSunday: 'Next Sunday', massSelect: 'Choose a Mass',
      noText: 'No text available for this date.',
      offline: 'You are offline',
      offlineDesc: 'Reconnect to access liturgical texts.',
      unavailable: 'Texts unavailable',
      unavailableDesc: 'Texts are not available for this date or zone.',
      retry: 'Retry',
    },
  },
  it: {
    groups: {
      messes:   { label: 'Messa',               desc: 'Testi del giorno',        time: '',      emoji: '✝️' },
      laudes:   { label: 'Lodi',                desc: 'Preghiera del mattino',   time: '6–9h',  emoji: '🌅' },
      vepres:   { label: 'Vespri',              desc: 'Preghiera della sera',    time: '18h',   emoji: '🌇' },
      complies: { label: 'Compieta',            desc: 'Preghiera della notte',   time: '21h',   emoji: '🌙' },
      lectures: { label: 'Ufficio delle lett.', desc: 'Vigilie',                 time: '',      emoji: '📖' },
      tierce:   { label: 'Terza',               desc: 'Ora intermedia',          time: '9h',    emoji: '🕘' },
      sexte:    { label: 'Sesta',               desc: 'Ora di mezzogiorno',      time: '12h',   emoji: '☀️' },
      none:     { label: 'Nona',                desc: 'Ora del pomeriggio',      time: '15h',   emoji: '🕒' },
    },
    lectures: {
      lecture_1: '1ª lettura', lecture_2: '2ª lettura', psaume: 'Salmo',
      sequence: 'Sequenza', evangile: 'Vangelo', verset_evangile: 'Alleluia',
    },
    ui: {
      back: 'Indietro', today: 'Oggi', yesterday: 'Ieri', tomorrow: 'Domani',
      nextSunday: 'Dom. prossima', massSelect: 'Scegli una messa',
      noText: 'Nessun testo disponibile per questa data.',
      offline: 'Sei offline',
      offlineDesc: 'Riconnettiti per accedere ai testi liturgici.',
      unavailable: 'Testi non disponibili',
      unavailableDesc: 'I testi non sono disponibili per questa data o zona.',
      retry: 'Riprova',
    },
  },
};

function getLang(lang: string): Lang {
  if (lang === 'en') return 'en';
  if (lang === 'it') return 'it';
  return 'fr';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/^Africa\//i.test(tz)) return 'afrique';
    if (tz === 'Europe/Paris') return 'france';
    if (tz === 'Europe/Brussels') return 'belgique';
    if (/^America\/(Toronto|Montreal|Halifax|Vancouver|Winnipeg|Regina|Edmonton|St_Johns)/i.test(tz)) return 'canada';
    if (tz === 'Europe/Zurich' || tz === 'Europe/Bern') return 'suisse';
    if (tz === 'Europe/Luxembourg') return 'luxembourg';
    if (tz === 'Europe/Monaco') return 'monaco';
  } catch { /* ignore */ }
  return 'romain';
}

function toDateStr(d: Date) { return format(d, 'yyyy-MM-dd'); }

async function fetchGroup(tab: TabId, date: string, zone: string): Promise<unknown> {
  const url = tab === 'messes'
    ? `${LITURGY_API}/messes/${date}/${zone}`
    : `${LITURGY_API}/offices/${tab}/${date}/${zone}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(14000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function extractParts(data: unknown, tab: TabId, masseIndex: number, labels: Record<string, string>): Part[] {
  const d = data as Record<string, unknown>;
  if (tab === 'messes') {
    const messes = (d?.messes as AelfMesse[]) || [];
    if (!messes.length) return [];
    const messe = messes[Math.min(masseIndex, messes.length - 1)];
    return (messe?.lectures || [])
      .filter((l: AelfLecture) => l.contenu || l.verset_evangile)
      .map((l: AelfLecture, i: number) => ({
        id: `${l.type ?? 'x'}_${i}`,
        label: labels[l.type ?? ''] || (l.type ?? '').replace(/_/g, ' '),
        kind: 'lecture' as const,
        data: l,
      }));
  }
  const office = d?.[tab] as Record<string, unknown> | undefined;
  if (!office) return [];
  const parts: Part[] = [];
  ((office.lectures ?? []) as AelfLecture[]).forEach((l, i) => {
    if (l.contenu || l.verset_evangile) {
      parts.push({
        id: `lec_${i}`,
        label: labels[l.type ?? ''] || (l.type ?? '').replace(/_/g, ' ') || String(i + 1),
        kind: 'lecture',
        data: l,
      });
    }
  });
  ((office.parties ?? []) as Record<string, unknown>[]).forEach((p, i) => {
    if (p.contenu || p.titre || p.antienne) {
      parts.push({
        id: `part_${i}`,
        label: (p.titre as string) || ((p.type as string) ?? '').replace(/_/g, ' ') || String(i + 1),
        kind: 'partie',
        data: p,
      });
    }
  });
  return parts;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const Lecture = ({ lecture, label }: { lecture: AelfLecture; label: string }) => {
  const isEvangile = (lecture.type ?? '').includes('evangile') && lecture.type !== 'verset_evangile';
  const isPsaume   = lecture.type === 'psaume';
  const isVerset   = lecture.type === 'verset_evangile';

  if (isVerset && !lecture.contenu && !lecture.verset_evangile) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="py-6"
    >
      <header className="mb-5">
        <p className={cn(
          'text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5',
          isEvangile ? 'text-amber-400' : isPsaume ? 'text-blue-400' : 'text-primary/60'
        )}>
          {isEvangile && <span className="mr-1.5">✝</span>}
          {label}
        </p>
        {lecture.ref && (
          <p className="text-sm italic text-muted-foreground/80 leading-snug">{lecture.ref}</p>
        )}
        {lecture.titre && lecture.titre !== lecture.ref && (
          <p className="text-sm text-muted-foreground/55 mt-0.5 italic">{lecture.titre}</p>
        )}
      </header>

      {isVerset && (
        <blockquote className="border-l-2 border-amber-500/50 pl-4 italic text-sm text-amber-200/80 leading-relaxed">
          {lecture.verset_evangile
            ? <span dangerouslySetInnerHTML={{ __html: lecture.verset_evangile }} />
            : lecture.contenu && <span dangerouslySetInnerHTML={{ __html: lecture.contenu }} />}
        </blockquote>
      )}

      {isPsaume && (
        <div className="space-y-4">
          {lecture.refrain && (
            <div className="bg-blue-900/25 border border-blue-700/30 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-blue-400/70 mb-1.5">Refrain</p>
              <p className="text-sm font-medium text-blue-100/90 leading-relaxed italic">{lecture.refrain}</p>
            </div>
          )}
          {lecture.contenu && (
            <div className="text-sm leading-[1.9] text-foreground/85 psalm-content"
              dangerouslySetInnerHTML={{ __html: lecture.contenu }} />
          )}
        </div>
      )}

      {!isPsaume && !isVerset && lecture.intro_lue && (
        <p className="text-xs italic text-muted-foreground/55 mb-4">{lecture.intro_lue}</p>
      )}
      {!isPsaume && !isVerset && lecture.contenu && (
        <div
          className={cn('leading-[1.9] reading-content',
            isEvangile ? 'text-[0.9375rem] text-foreground/95' : 'text-[0.875rem] text-foreground/85')}
          dangerouslySetInnerHTML={{ __html: lecture.contenu }}
        />
      )}
    </motion.section>
  );
};

const OfficePartie = ({ partie }: { partie: Record<string, unknown> }) => {
  const label = (partie.titre as string) || (partie.type as string) || '';
  if (!partie.contenu && !label && !partie.antienne) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="py-6"
    >
      {label && (
        <header className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/55 mb-0.5">{label}</p>
          {partie.ref && <p className="text-sm italic text-muted-foreground/70">{partie.ref as string}</p>}
        </header>
      )}
      {partie.antienne && (
        <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-primary/60 mb-1.5">Antienne</p>
          <p className="text-sm italic text-primary/90 leading-relaxed">{partie.antienne as string}</p>
        </div>
      )}
      {partie.contenu && (
        <div className="text-sm leading-[1.9] text-foreground/85 reading-content"
          dangerouslySetInnerHTML={{ __html: partie.contenu as string }} />
      )}
    </motion.section>
  );
};

const PartSkeleton = () => (
  <div className="animate-pulse pt-2 space-y-5">
    <div className="h-2 w-20 bg-white/10 rounded" />
    <div className="h-3.5 w-44 bg-white/8 rounded" />
    {[90, 100, 75, 95, 80, 60].map((w, i) => (
      <div key={i} className="h-3 bg-white/7 rounded" style={{ width: `${w}%` }} />
    ))}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const MesseOffice = () => {
  const { i18n } = useTranslation();
  const lang = getLang(i18n.language?.substring(0, 2) ?? 'fr');
  const L = I18N[lang];
  const dateLocale = lang === 'fr' ? fr : lang === 'it' ? it : enUS;

  const [date, setDate]         = useState<Date>(() => new Date());
  const [zone, setZone]         = useState<string>(() => localStorage.getItem('liturgical_zone') ?? detectZone());
  const [view, setView]         = useState<'overview' | 'content'>('overview');
  const [tab, setTab]           = useState<TabId>('messes');
  const [loading, setLoading]   = useState(false);
  const [offline, setOffline]   = useState(false);
  const [error, setError]       = useState(false);
  const [data, setData]         = useState<unknown>(null);
  const [liturgyName, setLiturgyName]   = useState('');
  const [liturgyColor, setLiturgyColor] = useState('');
  const [masseIndex, setMasseIndex]     = useState(0);
  const [parts, setParts]               = useState<Part[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [summaryColor, setSummaryColor] = useState('');
  const [summaryName, setSummaryName]   = useState('');

  const abortRef       = useRef<AbortController | null>(null);
  const summaryAbort   = useRef<AbortController | null>(null);
  const partsScrollRef = useRef<HTMLDivElement>(null);
  const dateStr = toDateStr(date);

  // ── Background summary fetch for overview liturgy info ────────────────────
  useEffect(() => {
    summaryAbort.current?.abort();
    const ctrl = new AbortController();
    summaryAbort.current = ctrl;
    setSummaryName(''); setSummaryColor('');
    (async () => {
      try {
        const r = await fetch(`${LITURGY_API}/messes/${dateStr}/${zone}`, { signal: AbortSignal.timeout(8000) });
        if (!r.ok || ctrl.signal.aborted) return;
        const json = await r.json() as { informations?: { jour_liturgique_nom?: string; couleur?: string } };
        if (ctrl.signal.aborted) return;
        const info = json?.informations ?? {};
        setSummaryName(info.jour_liturgique_nom ?? '');
        setSummaryColor(info.couleur?.toLowerCase() ?? '');
      } catch { /* ignore */ }
    })();
    return () => ctrl.abort();
  }, [dateStr, zone]);

  // ── Main content fetch ────────────────────────────────────────────────────
  const load = useCallback(async (d: string, z: string, t: TabId) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(false); setOffline(false); setData(null);
    setParts([]); setSelectedPartId(null);
    try {
      const result = await fetchGroup(t, d, z);
      if (ctrl.signal.aborted) return;
      const info = (result as { informations?: AelfInformations })?.informations ?? {};
      setLiturgyName(info.jour_liturgique_nom ?? '');
      setLiturgyColor(info.couleur?.toLowerCase() ?? '');
      setData(result);
    } catch {
      if (ctrl.signal.aborted) return;
      if (!navigator.onLine) setOffline(true);
      else setError(true);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  // Trigger load when entering content view
  useEffect(() => {
    if (view === 'content') { setMasseIndex(0); load(dateStr, zone, tab); }
  }, [view, tab, dateStr, zone]); // eslint-disable-line

  // Extract parts from loaded data
  useEffect(() => {
    if (!data || loading) return;
    const extracted = extractParts(data, tab, masseIndex, L.lectures);
    setParts(extracted);
    setSelectedPartId(extracted[0]?.id ?? null);
  }, [data, tab, masseIndex, lang, loading]); // eslint-disable-line

  // Scroll active part button into view
  useEffect(() => {
    if (!selectedPartId || !partsScrollRef.current) return;
    const el = partsScrollRef.current.querySelector(`[data-part="${selectedPartId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedPartId]);

  const changeZone = (z: string) => { setZone(z); localStorage.setItem('liturgical_zone', z); };
  const goDate = (d: Date) => { setDate(d); setLiturgyName(''); setLiturgyColor(''); };
  const openGroup = (t: TabId) => { setTab(t); setView('content'); };
  const goBack = () => { setView('overview'); abortRef.current?.abort(); };

  const displayColor  = view === 'content' ? liturgyColor : summaryColor;
  const displayName   = view === 'content' ? liturgyName  : summaryName;
  const couleurStyle  = displayColor ? COULEUR_CLASSES[displayColor] : null;
  const messes        = ((data as Record<string, unknown>)?.messes as AelfMesse[]) ?? [];
  const selectedPart  = parts.find(p => p.id === selectedPartId);
  const cardStyle     = CARD_STYLES[tab];

  const dateShortcuts = [
    { label: L.ui.yesterday,  fn: () => goDate(subDays(new Date(), 1)) },
    { label: L.ui.today,      fn: () => goDate(new Date()) },
    { label: L.ui.tomorrow,   fn: () => goDate(addDays(new Date(), 1)) },
    { label: L.ui.nextSunday, fn: () => goDate(nextSunday(new Date())) },
  ];

  // ── Part content renderer ─────────────────────────────────────────────────
  const renderPart = () => {
    if (loading || (data && parts.length === 0 && !error && !offline)) return <PartSkeleton />;
    if (offline) return (
      <div className="flex flex-col items-center gap-4 py-20 text-center px-4">
        <WifiOff className="w-10 h-10 text-muted-foreground/30" />
        <div>
          <p className="font-medium text-foreground/70 mb-1">{L.ui.offline}</p>
          <p className="text-sm text-muted-foreground">{L.ui.offlineDesc}</p>
        </div>
      </div>
    );
    if (error) return (
      <div className="flex flex-col items-center gap-4 py-20 text-center px-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground/30" />
        <div>
          <p className="font-medium text-foreground/70 mb-1">{L.ui.unavailable}</p>
          <p className="text-sm text-muted-foreground">{L.ui.unavailableDesc}</p>
        </div>
        <button
          onClick={() => load(dateStr, zone, tab)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {L.ui.retry}
        </button>
      </div>
    );
    if (!selectedPart) return (
      <div className="py-20 text-center">
        <CalendarDays className="w-8 h-8 mx-auto mb-3 text-muted-foreground/25" />
        <p className="text-sm text-muted-foreground">{L.ui.noText}</p>
      </div>
    );
    if (selectedPart.kind === 'lecture') {
      return <Lecture lecture={selectedPart.data as AelfLecture} label={selectedPart.label} />;
    }
    return <OfficePartie partie={selectedPart.data as Record<string, unknown>} />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>
          {view === 'content'
            ? `${L.groups[tab].label} — ${format(date, 'd MMMM', { locale: dateLocale })}`
            : `Liturgie — ${format(date, 'd MMMM yyyy', { locale: dateLocale })}`}
        </title>
        <style>{`
          .reading-content p { margin-bottom: 1em; }
          .reading-content p:last-child { margin-bottom: 0; }
          .reading-content strong, .reading-content b { color: hsl(var(--primary)); font-weight: 600; }
          .reading-content em, .reading-content i { color: hsl(var(--foreground) / 0.65); }
          .psalm-content p { margin-bottom: 0.6em; }
          .psalm-content p:last-child { margin-bottom: 0; }
        `}</style>
      </Helmet>

      <Navigation />

      {/* Liturgical colour strip */}
      <AnimatePresence>
        {displayColor && couleurStyle && (
          <motion.div
            key={displayColor}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={cn('h-0.5 w-full origin-left', couleurStyle.bg)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-[680px] mx-auto px-5 pb-28">

        {/* ══ DATE HEADER ══════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between pt-6 pb-4">
          <button
            onClick={() => goDate(subDays(date, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex-1 text-center group">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/65 mb-0.5">
                  {format(date, 'EEEE', { locale: dateLocale })}
                  {isToday(date) && (
                    <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      {L.ui.today}
                    </span>
                  )}
                </p>
                <p className="font-cinzel text-4xl font-bold text-foreground leading-none group-hover:text-primary transition-colors">
                  {format(date, 'd')}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 uppercase tracking-widest">
                  {format(date, 'MMMM yyyy', { locale: dateLocale })}
                </p>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <div className="p-2 flex gap-1 flex-wrap border-b border-border/40">
                {dateShortcuts.map(({ label, fn }) => (
                  <button key={label} onClick={fn}
                    className="text-xs px-2 py-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                    {label}
                  </button>
                ))}
              </div>
              <Calendar mode="single" selected={date} onSelect={(d: Date | undefined) => d && goDate(d)} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <button
            onClick={() => goDate(addDays(date, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ══ FEAST NAME ════════════════════════════════════════════════════════ */}
        <div className="text-center pb-4 min-h-[22px]">
          <AnimatePresence mode="wait">
            {displayName ? (
              <motion.p
                key={displayName}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn('text-sm font-medium italic', couleurStyle ? couleurStyle.text : 'text-muted-foreground')}
              >
                {displayName}
              </motion.p>
            ) : view === 'overview' ? (
              <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-3.5 w-48 bg-white/8 rounded mx-auto animate-pulse" />
            ) : null}
          </AnimatePresence>
        </div>

        {/* ══ ZONE SELECTOR ════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-1.5 pb-7">
          <MapPin className="w-3 h-3 text-muted-foreground/45" />
          <Select value={zone} onValueChange={changeZone}>
            <SelectTrigger className="h-6 text-[11px] border-0 bg-transparent text-muted-foreground/55 hover:text-muted-foreground w-auto gap-1 focus:ring-0 px-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONES.map(z => (
                <SelectItem key={z.value} value={z.value} className="text-xs">{z.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ══ MAIN VIEWS ════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
          {view === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.16 }}
            >
              <div className="grid grid-cols-2 gap-3">
                {TABS.map((t, idx) => {
                  const info  = L.groups[t.id];
                  const style = CARD_STYLES[t.id];
                  return (
                    <motion.button
                      key={t.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.045, duration: 0.22 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => openGroup(t.id)}
                      className={cn(
                        'relative overflow-hidden rounded-2xl border text-left p-4 transition-all duration-200',
                        'bg-white/[0.025] hover:bg-white/[0.05]',
                        style.border,
                        'hover:scale-[1.02] active:scale-[0.97]',
                        'group'
                      )}
                    >
                      {/* Gradient glow */}
                      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none', style.glow, 'to-transparent')} />
                      {/* Dot accent */}
                      <div className={cn('absolute top-3 right-3 w-1.5 h-1.5 rounded-full opacity-60', style.dot)} />

                      <span className="text-[2rem] mb-3 block leading-none relative">{info.emoji}</span>
                      <p className={cn('text-sm font-bold leading-tight mb-0.5 relative', style.accent)}>
                        {info.label}
                      </p>
                      <p className="text-[11px] text-white/45 leading-snug relative">{info.desc}</p>
                      {info.time && (
                        <p className="text-[10px] text-white/28 mt-1.5 font-mono relative">{info.time}</p>
                      )}
                      <ChevronRight className={cn(
                        'absolute right-3.5 bottom-4 w-3.5 h-3.5 transition-all duration-200',
                        'text-white/15 group-hover:text-white/35 group-hover:translate-x-0.5'
                      )} />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── CONTENT VIEW ─────────────────────────────────────────────────── */}
          {view === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
            >
              {/* Back + group title */}
              <div className="flex items-center gap-3 pb-5">
                <button
                  onClick={goBack}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                  aria-label={L.ui.back}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl leading-none">{L.groups[tab].emoji}</span>
                  <div>
                    <p className={cn('text-base font-bold', cardStyle.accent)}>
                      {L.groups[tab].label}
                    </p>
                    {L.groups[tab].time && (
                      <p className="text-[10px] text-muted-foreground/45 font-mono leading-none mt-0.5">{L.groups[tab].time}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mass selector — only when multiple masses */}
              {tab === 'messes' && !loading && messes.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5"
                >
                  <Select
                    value={String(masseIndex)}
                    onValueChange={v => setMasseIndex(Number(v))}
                  >
                    <SelectTrigger className="w-full text-sm bg-white/[0.04] border-white/10 rounded-xl h-10">
                      <SelectValue placeholder={L.ui.massSelect} />
                    </SelectTrigger>
                    <SelectContent>
                      {messes.map((m, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {m.nom || `${L.groups.messes.label} ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              {/* ── Horizontal parts navigation ─────────────────────────────── */}
              {!loading && !error && !offline && parts.length > 0 && (
                <div
                  ref={partsScrollRef}
                  className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-5 px-5"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {parts.map(p => {
                    const isActive = selectedPartId === p.id;
                    return (
                      <button
                        key={p.id}
                        data-part={p.id}
                        onClick={() => setSelectedPartId(p.id)}
                        className={cn(
                          'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium',
                          'transition-all duration-150 whitespace-nowrap',
                          isActive
                            ? cn(
                                'text-white shadow-md',
                                couleurStyle ? couleurStyle.bg : 'bg-primary'
                              )
                            : 'bg-white/[0.06] text-muted-foreground/65 border border-white/8 hover:bg-white/10 hover:text-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Divider */}
              {!loading && !error && !offline && parts.length > 0 && (
                <div className="h-px bg-white/8 mb-2" />
              )}

              {/* ── Part content ──────────────────────────────────────────────── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedPartId}-${dateStr}-${masseIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                >
                  {renderPart()}
                </motion.div>
              </AnimatePresence>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default MesseOffice;
