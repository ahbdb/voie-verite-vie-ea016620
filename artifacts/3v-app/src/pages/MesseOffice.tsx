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
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AelfInformations {
  jour_liturgique_nom?: string;
  couleur?: string;
  date?: string;
  annee?: string;
  semaine?: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────
const AELF = 'https://api.aelf.org/v1';

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
  { id: 'messes',   label: 'Messe' },
  { id: 'laudes',   label: 'Laudes' },
  { id: 'vepres',   label: 'Vêpres' },
  { id: 'complies', label: 'Complies' },
  { id: 'lectures', label: 'Lectures' },
  { id: 'tierce',   label: 'Tierce' },
  { id: 'sexte',    label: 'Sexte' },
  { id: 'none',     label: 'None' },
] as const;
type TabId = typeof TABS[number]['id'];

const COULEUR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  rouge:  { bg: 'bg-red-600',    text: 'text-red-400',    border: 'border-red-500' },
  vert:   { bg: 'bg-green-600',  text: 'text-green-400',  border: 'border-green-500' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-400', border: 'border-violet-500' },
  blanc:  { bg: 'bg-amber-100',  text: 'text-amber-200',  border: 'border-amber-300' },
  or:     { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-400' },
  rose:   { bg: 'bg-pink-500',   text: 'text-pink-400',   border: 'border-pink-400' },
  noir:   { bg: 'bg-gray-700',   text: 'text-gray-300',   border: 'border-gray-500' },
};

const LECTURE_LABELS: Record<string, string> = {
  lecture_1:        'Première lecture',
  lecture_2:        'Deuxième lecture',
  psaume:           'Psaume',
  sequence:         'Séquence',
  evangile:         'Évangile',
  verset_evangile:  'Verset avant l\'Évangile',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/^Africa\//i.test(tz))  return 'afrique';
    if (tz === 'Europe/Paris')   return 'france';
    if (tz === 'Europe/Brussels') return 'belgique';
    if (/^America\/(Toronto|Montreal|Halifax|Vancouver|Winnipeg|Regina|Edmonton|St_Johns)/i.test(tz)) return 'canada';
    if (tz === 'Europe/Zurich' || tz === 'Europe/Bern') return 'suisse';
    if (tz === 'Europe/Luxembourg') return 'luxembourg';
    if (tz === 'Europe/Monaco')  return 'monaco';
  } catch { /* ignore */ }
  return 'romain';
}

function toDateStr(d: Date) { return format(d, 'yyyy-MM-dd'); }

// ─── Fetchers ─────────────────────────────────────────────────────────────────
async function fetchTab(tab: TabId, date: string, zone: string): Promise<any> {
  if (tab === 'messes') {
    const r = await fetch(`${AELF}/messes/${date}/${zone}`, { signal: AbortSignal.timeout(14000) });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }
  const r = await fetch(`${AELF}/offices/${tab}/${date}/${zone}`, { signal: AbortSignal.timeout(14000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// ─── Reading components ───────────────────────────────────────────────────────

/** Renders a single AELF lecture (reading, psalm, gospel, etc.) in AELF style */
const Lecture = ({ lecture, index }: { lecture: AelfLecture; index: number }) => {
  const type   = lecture.type || '';
  const label  = LECTURE_LABELS[type] || type.replace(/_/g, ' ');
  const isEvangile = type.includes('evangile') && type !== 'verset_evangile';
  const isPsaume  = type === 'psaume';
  const isVerset  = type === 'verset_evangile';

  if (isVerset && !lecture.contenu && !lecture.verset_evangile) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="py-8 border-b border-white/8 last:border-0"
    >
      {/* ── Section header ── */}
      <header className="mb-5">
        <p className={cn(
          'text-[10px] font-bold uppercase tracking-[0.2em] mb-1',
          isEvangile ? 'text-amber-400' : isPsaume ? 'text-blue-400' : 'text-primary/60'
        )}>
          {isEvangile && <span className="mr-1.5">✝</span>}
          {label}
        </p>
        {lecture.ref && (
          <p className="text-sm italic text-muted-foreground/80 leading-snug">{lecture.ref}</p>
        )}
        {lecture.titre && lecture.titre !== lecture.ref && (
          <p className="text-sm text-muted-foreground/60 mt-0.5 italic">{lecture.titre}</p>
        )}
      </header>

      {/* ── Verset évangile ── */}
      {isVerset && (
        <blockquote className="border-l-2 border-amber-500/50 pl-4 italic text-sm text-amber-200/80 leading-relaxed">
          {lecture.verset_evangile
            ? <span dangerouslySetInnerHTML={{ __html: lecture.verset_evangile }} />
            : lecture.contenu && <span dangerouslySetInnerHTML={{ __html: lecture.contenu }} />}
        </blockquote>
      )}

      {/* ── Psalm refrain + verses ── */}
      {isPsaume && (
        <div className="space-y-4">
          {lecture.refrain && (
            <div className="bg-blue-900/25 border border-blue-700/30 rounded-lg px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-blue-400/70 mb-1.5">Refrain</p>
              <p className="text-sm font-medium text-blue-100/90 leading-relaxed italic">
                {lecture.refrain}
              </p>
            </div>
          )}
          {lecture.contenu && (
            <div
              className="text-sm leading-[1.9] text-foreground/85 psalm-content"
              dangerouslySetInnerHTML={{ __html: lecture.contenu }}
            />
          )}
        </div>
      )}

      {/* ── Regular reading ── */}
      {!isPsaume && !isVerset && lecture.intro_lue && (
        <p className="text-xs italic text-muted-foreground/60 mb-4">{lecture.intro_lue}</p>
      )}
      {!isPsaume && !isVerset && lecture.contenu && (
        <div
          className={cn(
            'leading-[1.9] reading-content',
            isEvangile
              ? 'text-[0.9375rem] text-foreground/95'
              : 'text-[0.875rem] text-foreground/85'
          )}
          dangerouslySetInnerHTML={{ __html: lecture.contenu }}
        />
      )}
    </motion.section>
  );
};

/** Renders an office partie (hymn, antiphon, etc.) */
const OfficePartie = ({ partie, index }: { partie: any; index: number }) => {
  if (!partie?.contenu && !partie?.titre) return null;
  const label = partie.titre || partie.type || '';
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="py-7 border-b border-white/8 last:border-0"
    >
      {label && (
        <header className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/55 mb-0.5">{label}</p>
          {partie.ref && <p className="text-sm italic text-muted-foreground/70">{partie.ref}</p>}
        </header>
      )}
      {partie.antienne && (
        <div className="bg-primary/8 border border-primary/20 rounded-lg px-4 py-3 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-primary/60 mb-1.5">Antienne</p>
          <p className="text-sm italic text-primary/90 leading-relaxed">{partie.antienne}</p>
        </div>
      )}
      {partie.contenu && (
        <div
          className="text-sm leading-[1.9] text-foreground/85 reading-content"
          dangerouslySetInnerHTML={{ __html: partie.contenu }}
        />
      )}
    </motion.section>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="space-y-8 pt-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="py-7 border-b border-white/8">
        <div className="h-2.5 w-24 bg-white/10 rounded mb-2" />
        <div className="h-3.5 w-40 bg-white/8 rounded mb-5" />
        {Array.from({ length: 5 }).map((_, j) => (
          <div key={j} className={`h-3 bg-white/${j % 3 === 2 ? '5' : '8'} rounded mb-2.5`} style={{ width: `${70 + (j * 7) % 30}%` }} />
        ))}
      </div>
    ))}
  </div>
);

// ─── Error state ──────────────────────────────────────────────────────────────
const ErrorState = ({ offline, onRetry }: { offline: boolean; onRetry: () => void }) => (
  <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
    {offline
      ? <WifiOff className="w-10 h-10 text-muted-foreground/40" />
      : <AlertCircle className="w-10 h-10 text-muted-foreground/40" />}
    <div>
      <p className="font-medium text-foreground/70">
        {offline ? 'Vous êtes hors ligne' : 'Textes indisponibles'}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {offline
          ? 'Reconnectez-vous pour accéder aux textes liturgiques.'
          : 'Les textes ne sont pas disponibles pour cette date ou zone. Réessayez ou consultez directement aelf.org'}
      </p>
    </div>
    {!offline && (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-1"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Réessayer
      </button>
    )}
    <a
      href="https://www.aelf.org"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-muted-foreground/50 underline hover:text-muted-foreground transition-colors"
    >
      Ouvrir aelf.org
    </a>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const MesseOffice = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'fr';
  const dateLocale = lang === 'fr' ? fr : lang === 'it' ? it : enUS;

  const [date, setDate]       = useState<Date>(() => new Date());
  const [zone, setZone]       = useState<string>(() => localStorage.getItem('liturgical_zone') || detectZone());
  const [tab, setTab]         = useState<TabId>('messes');
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError]     = useState(false);
  const [data, setData]       = useState<any>(null);
  const [liturgyName, setLiturgyName] = useState('');
  const [liturgyColor, setLiturgyColor] = useState('');
  const tabsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dateStr = toDateStr(date);

  const load = useCallback(async (d: string, z: string, t: TabId) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(false); setOffline(false); setData(null);
    try {
      const result = await fetchTab(t, d, z);
      if (ctrl.signal.aborted) return;
      const info: AelfInformations = result?.informations || {};
      if (info.jour_liturgique_nom) setLiturgyName(info.jour_liturgique_nom);
      if (info.couleur) setLiturgyColor(info.couleur.toLowerCase());
      setData(result);
    } catch (err: any) {
      if (ctrl.signal.aborted) return;
      if (!navigator.onLine) { setOffline(true); }
      else { setError(true); }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { load(dateStr, zone, tab); }, [dateStr, zone, tab]); // eslint-disable-line

  const changeZone = (z: string) => { setZone(z); localStorage.setItem('liturgical_zone', z); };

  const goDate = (d: Date) => { setDate(d); setLiturgyName(''); setLiturgyColor(''); };

  const changeTab = (t: TabId) => {
    setTab(t);
    // scroll tab into view
    setTimeout(() => {
      const el = tabsRef.current?.querySelector(`[data-tab="${t}"]`) as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  };

  // ── Content renderer ────────────────────────────────────────────────────────
  const renderContent = () => {
    if (loading) return <Skeleton />;
    if (offline) return <ErrorState offline onRetry={() => load(dateStr, zone, tab)} />;
    if (error)   return <ErrorState offline={false} onRetry={() => load(dateStr, zone, tab)} />;
    if (!data)   return null;

    if (tab === 'messes') {
      const messes: AelfMesse[] = data.messes || [];
      if (!messes.length) return <EmptyState />;
      return (
        <div>
          {messes.map((m, mi) => (
            <div key={mi}>
              {m.nom && messes.length > 1 && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-bold mt-8 mb-2">{m.nom}</p>
              )}
              {(m.lectures || []).map((l, li) => <Lecture key={li} lecture={l} index={li} />)}
            </div>
          ))}
        </div>
      );
    }

    // Office
    const office = data?.[tab];
    if (!office) return <EmptyState />;
    const parties = office.parties || [];
    const lectures = office.lectures || [];
    if (!parties.length && !lectures.length) return <EmptyState />;
    return (
      <div>
        {lectures.map((l: AelfLecture, i: number) => <Lecture key={i} lecture={l} index={i} />)}
        {parties.map((p: any, i: number) => <OfficePartie key={i} partie={p} index={i} />)}
      </div>
    );
  };

  const couleurStyle = liturgyColor ? COULEUR_CLASSES[liturgyColor] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Messe et Office — 3V</title>
        <style>{`
          .reading-content p   { margin-bottom: 1em; }
          .reading-content p:last-child { margin-bottom: 0; }
          .reading-content strong,
          .reading-content b   { color: hsl(var(--primary)); font-weight: 600; }
          .reading-content em,
          .reading-content i   { color: hsl(var(--foreground)/0.65); }
          .psalm-content  p    { margin-bottom: 0.6em; }
          .psalm-content  p:last-child { margin-bottom: 0; }
        `}</style>
      </Helmet>

      <Navigation />

      {/* ── Liturgical colour band ─────────────────────────────────────── */}
      {liturgyColor && couleurStyle && (
        <div className={cn('h-1 w-full', couleurStyle.bg)} />
      )}

      <div className="max-w-[680px] mx-auto px-5 pb-28">

        {/* ══ DATE HEADER ══════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between pt-6 pb-5">
          {/* Prev */}
          <button
            onClick={() => goDate(subDays(date, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Date display */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex-1 text-center group">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70 mb-0.5">
                  {format(date, 'EEEE', { locale: dateLocale })}
                  {isToday(date) && (
                    <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      Aujourd'hui
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
              <div className="p-2 flex gap-1 border-b border-border/40">
                {[
                  { label: 'Hier',      fn: () => goDate(subDays(new Date(), 1)) },
                  { label: "Aujourd'hui", fn: () => goDate(new Date()) },
                  { label: 'Demain',    fn: () => goDate(addDays(new Date(), 1)) },
                  { label: 'Dim. prochain', fn: () => goDate(nextSunday(new Date())) },
                ].map(({ label, fn }) => (
                  <button key={label} onClick={fn} className="text-xs px-2 py-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                    {label}
                  </button>
                ))}
              </div>
              <Calendar mode="single" selected={date} onSelect={d => d && goDate(d)} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* Next */}
          <button
            onClick={() => goDate(addDays(date, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ══ FEAST NAME ══════════════════════════════════════════════════ */}
        <div className="text-center pb-5">
          {liturgyName ? (
            <p className={cn(
              'text-sm font-medium italic',
              couleurStyle ? couleurStyle.text : 'text-muted-foreground'
            )}>
              {liturgyName}
            </p>
          ) : loading ? (
            <div className="h-4 w-56 bg-white/10 rounded mx-auto animate-pulse" />
          ) : null}
        </div>

        {/* ══ ZONE SELECTOR ══════════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-1.5 pb-6">
          <MapPin className="w-3 h-3 text-muted-foreground/50" />
          <Select value={zone} onValueChange={changeZone}>
            <SelectTrigger className="h-6 text-[11px] border-0 bg-transparent text-muted-foreground/60 hover:text-muted-foreground w-auto gap-1 focus:ring-0 px-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONES.map(z => (
                <SelectItem key={z.value} value={z.value} className="text-xs">{z.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ══ TABS ═══════════════════════════════════════════════════════ */}
        <div
          ref={tabsRef}
          className="flex overflow-x-auto gap-0 border-b border-white/12 mb-1 -mx-5 px-5 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {TABS.map(t => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                data-tab={t.id}
                onClick={() => changeTab(t.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-150 border-b-2 -mb-px whitespace-nowrap',
                  isActive
                    ? 'text-foreground border-primary'
                    : 'border-transparent text-muted-foreground/55 hover:text-muted-foreground hover:border-white/20'
                )}
                style={isActive && couleurStyle ? { borderColor: '', color: '' } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ══ CONTENT ════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${dateStr}-${zone}-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="py-20 text-center">
    <CalendarDays className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
    <p className="text-sm text-muted-foreground">Aucun texte disponible pour cette date.</p>
  </div>
);

export default MesseOffice;
