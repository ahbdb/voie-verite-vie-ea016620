import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { format, addDays, subDays, nextSunday, isToday } from 'date-fns';
import { fr, enUS, it } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen, ChevronLeft, ChevronRight, CalendarIcon, MapPin,
  RefreshCw, AlertCircle, Sun, Moon, Sunset, Stars,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AelfInformations {
  jour_liturgique_nom?: string;
  couleur?: string;
  date?: string;
  annee?: string;
}

interface AelfLecture {
  type: string;
  titre?: string;
  ref?: string;
  intro_lue?: string;
  contenu?: string;
  refrain?: string;
  verset_evangile?: string;
}

interface AelfMesse {
  nom?: string;
  lectures: AelfLecture[];
}

interface AelfOfficePartie {
  type?: string;
  titre?: string;
  contenu?: string;
  antienne?: string;
  ref?: string;
}

interface AelfOffice {
  nom?: string;
  parties?: AelfOfficePartie[];
  lectures?: AelfLecture[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AELF_BASE = 'https://api.aelf.org/v1';

const ZONES = [
  { value: 'afrique',    label: 'Afrique (Cameroun, francophone)' },
  { value: 'france',     label: 'France' },
  { value: 'belgique',   label: 'Belgique' },
  { value: 'canada',     label: 'Canada' },
  { value: 'luxembourg', label: 'Luxembourg' },
  { value: 'suisse',     label: 'Suisse' },
  { value: 'monaco',     label: 'Monaco' },
  { value: 'romain',     label: 'Calendrier romain universel' },
];

const OFFICES = [
  { id: 'messes',    label: 'Messe',        icon: Sun },
  { id: 'laudes',    label: 'Laudes',       icon: Sun },
  { id: 'vepres',    label: 'Vêpres',       icon: Sunset },
  { id: 'complies',  label: 'Complies',     icon: Moon },
  { id: 'lectures',  label: 'Office des Lectures', icon: BookOpen },
  { id: 'tierce',    label: 'Tierce / Sexte / None', icon: Stars },
] as const;

type OfficeId = typeof OFFICES[number]['id'];

const LITURGY_COLORS: Record<string, string> = {
  rouge:  'text-red-400',
  vert:   'text-green-400',
  violet: 'text-purple-400',
  blanc:  'text-yellow-100',
  noir:   'text-gray-300',
  rose:   'text-pink-400',
  or:     'text-yellow-400',
};

// ── Zone detection ────────────────────────────────────────────────────────────
function detectZoneFromTimezone(): string {
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

// ── AELF fetchers ─────────────────────────────────────────────────────────────
async function fetchMesses(date: string, zone: string): Promise<{ informations: AelfInformations; messes: AelfMesse[] }> {
  const res = await fetch(`${AELF_BASE}/messes/${date}/${zone}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`AELF ${res.status}`);
  return res.json();
}

async function fetchOffice(office: string, date: string, zone: string): Promise<{ informations: AelfInformations; [key: string]: any }> {
  const res = await fetch(`${AELF_BASE}/offices/${office}/${date}/${zone}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`AELF ${res.status}`);
  return res.json();
}

async function fetchTierceGroup(date: string, zone: string): Promise<any> {
  const results = await Promise.allSettled([
    fetchOffice('tierce', date, zone),
    fetchOffice('sexte', date, zone),
    fetchOffice('none', date, zone),
  ]);
  return results;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function cleanHtml(html: string = ''): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ── Sub-components ────────────────────────────────────────────────────────────
const LectureBlock = ({ lecture, lang }: { lecture: AelfLecture; lang: string }) => {
  const isEvangile = lecture.type?.includes('evangile');
  const isPsaume = lecture.type === 'psaume';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mb-8 rounded-lg p-5',
        isEvangile
          ? 'bg-yellow-900/20 border border-yellow-700/30'
          : isPsaume
          ? 'bg-purple-900/20 border border-purple-700/30'
          : 'bg-white/5 border border-white/10',
      )}
    >
      {lecture.titre && (
        <h3 className="font-cinzel text-sm font-semibold text-primary/80 mb-1 uppercase tracking-widest">
          {lecture.titre}
        </h3>
      )}
      {lecture.ref && (
        <p className="text-xs italic text-muted-foreground mb-3">{lecture.ref}</p>
      )}
      {lecture.intro_lue && (
        <p className="text-sm text-muted-foreground mb-3 italic">{lecture.intro_lue}</p>
      )}
      {lecture.verset_evangile && lecture.verset_evangile.trim() && (
        <p className="text-sm italic text-yellow-400/80 mb-3 border-l-2 border-yellow-500/40 pl-3">
          {cleanHtml(lecture.verset_evangile)}
        </p>
      )}
      {lecture.refrain && (
        <p className="text-sm font-medium text-purple-300 mb-3 italic">R/ {cleanHtml(lecture.refrain)}</p>
      )}
      {lecture.contenu && (
        <div
          className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line liturgical-text"
          dangerouslySetInnerHTML={{ __html: lecture.contenu }}
        />
      )}
    </motion.div>
  );
};

const OfficeBlock = ({ partie }: { partie: AelfOfficePartie }) => {
  if (!partie.contenu && !partie.titre) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 pb-6 border-b border-white/10 last:border-0"
    >
      {partie.titre && (
        <h4 className="font-cinzel text-xs font-semibold text-primary/70 uppercase tracking-widest mb-2">
          {partie.titre}
        </h4>
      )}
      {partie.ref && (
        <p className="text-xs italic text-muted-foreground mb-2">{partie.ref}</p>
      )}
      {partie.antienne && (
        <p className="text-sm italic text-yellow-400/80 mb-2 border-l-2 border-yellow-500/40 pl-3">
          Ant. {cleanHtml(partie.antienne)}
        </p>
      )}
      {partie.contenu && (
        <div
          className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line liturgical-text"
          dangerouslySetInnerHTML={{ __html: partie.contenu }}
        />
      )}
    </motion.div>
  );
};

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    <p className="text-sm text-muted-foreground">Chargement des textes liturgiques…</p>
  </div>
);

const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
    <AlertCircle className="w-10 h-10 text-destructive/60" />
    <div>
      <p className="font-medium text-foreground/80">Textes indisponibles</p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
    <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
      <RefreshCw className="w-3.5 h-3.5" />
      Réessayer
    </Button>
    <p className="text-xs text-muted-foreground">
      Si le problème persiste, vous pouvez consulter directement{' '}
      <a href="https://www.aelf.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">
        aelf.org
      </a>
    </p>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const MesseOffice = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'fr';
  const dateLocale = lang === 'fr' ? fr : lang === 'it' ? it : enUS;

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [zone, setZone] = useState<string>(() => {
    return localStorage.getItem('liturgical_zone') || detectZoneFromTimezone();
  });
  const [activeTab, setActiveTab] = useState<OfficeId>('messes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [liturgicalName, setLiturgicalName] = useState<string>('');
  const [liturgicalColor, setLiturgicalColor] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const dateStr = toDateStr(selectedDate);

  const fetchContent = useCallback(async (date: string, z: string, office: OfficeId) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      let result: any;
      if (office === 'messes') {
        result = await fetchMesses(date, z);
        if (result.informations?.jour_liturgique_nom) {
          setLiturgicalName(result.informations.jour_liturgique_nom);
          setLiturgicalColor(result.informations.couleur || '');
        }
      } else if (office === 'tierce') {
        result = await fetchTierceGroup(date, z);
        if (!liturgicalName) {
          const first = result.find((r: any) => r.status === 'fulfilled');
          if (first?.value?.informations?.jour_liturgique_nom) {
            setLiturgicalName(first.value.informations.jour_liturgique_nom);
          }
        }
      } else {
        result = await fetchOffice(office, date, z);
        if (result.informations?.jour_liturgique_nom && !liturgicalName) {
          setLiturgicalName(result.informations.jour_liturgique_nom);
          setLiturgicalColor(result.informations.couleur || '');
        }
      }
      if (!ctrl.signal.aborted) setData(result);
    } catch (err: any) {
      if (ctrl.signal.aborted) return;
      if (err?.name === 'TimeoutError' || err?.message?.includes('timeout')) {
        setError("L'API liturgique ne répond pas. Vérifiez votre connexion et réessayez.");
      } else if (!navigator.onLine) {
        setError('Vous êtes hors ligne. Reconnectez-vous pour accéder aux textes liturgiques.');
      } else {
        setError("Les textes liturgiques ne sont pas disponibles pour cette date ou cette zone.");
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchContent(dateStr, zone, activeTab);
  }, [dateStr, zone, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoneChange = (z: string) => {
    setZone(z);
    localStorage.setItem('liturgical_zone', z);
  };

  const goToDate = (d: Date) => {
    setSelectedDate(d);
    setLiturgicalName('');
  };

  const nextSundayDate = nextSunday(new Date());

  // ── Render content based on active tab ──────────────────────────────────
  const renderContent = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={() => fetchContent(dateStr, zone, activeTab)} />;
    if (!data) return null;

    if (activeTab === 'messes') {
      const messes: AelfMesse[] = data.messes || [];
      if (!messes.length) return <p className="text-center text-muted-foreground py-16">Aucun texte disponible pour cette date.</p>;
      return (
        <div className="space-y-2">
          {messes.map((messe, mi) => (
            <div key={mi}>
              {messe.nom && messes.length > 1 && (
                <h2 className="font-cinzel text-base font-semibold text-primary mb-4 mt-6">{messe.nom}</h2>
              )}
              {(messe.lectures || []).map((lecture, li) => (
                <LectureBlock key={li} lecture={lecture} lang={lang} />
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'tierce') {
      const results: PromiseSettledResult<any>[] = data;
      const labels = ['Tierce', 'Sexte', 'None'];
      return (
        <div className="space-y-8">
          {results.map((r, i) => (
            <div key={i}>
              <h2 className="font-cinzel text-base font-semibold text-primary mb-4 border-b border-primary/20 pb-2">
                {labels[i]}
              </h2>
              {r.status === 'rejected' ? (
                <p className="text-sm text-muted-foreground italic">Office non disponible.</p>
              ) : (
                <OfficeDataRenderer data={r.value} officeId={['tierce', 'sexte', 'none'][i]} />
              )}
            </div>
          ))}
        </div>
      );
    }

    return <OfficeDataRenderer data={data} officeId={activeTab} />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Messe et Office — 3V</title>
        <style>{`
          .liturgical-text p { margin-bottom: 0.75em; }
          .liturgical-text p:last-child { margin-bottom: 0; }
          .liturgical-text strong, .liturgical-text b { color: hsl(var(--primary)); }
          .liturgical-text em, .liturgical-text i { color: hsl(var(--foreground) / 0.75); }
          .liturgical-text br { display: block; content: ''; margin-top: 0.4em; }
          .font-cinzel { font-family: 'Cinzel', 'Georgia', serif; }
        `}</style>
      </Helmet>
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-cinzel text-xl font-bold tracking-wide text-primary">Messe et Office</h1>
          </div>
          <p className="text-xs text-muted-foreground">Textes liturgiques officiels — AELF</p>
        </motion.div>

        {/* ── Date navigation ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-2 mb-4 flex-wrap"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToDate(subDays(selectedDate, 1))}
            title="Jour précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-2 font-medium text-sm flex-1 min-w-0 max-w-[200px]',
                  isToday(selectedDate) && 'border-primary/60 text-primary'
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">
                  {isToday(selectedDate)
                    ? "Aujourd'hui"
                    : format(selectedDate, 'EEEE d MMMM yyyy', { locale: dateLocale })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && goToDate(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToDate(addDays(selectedDate, 1))}
            title="Jour suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="flex gap-1.5 flex-wrap">
            {!isToday(selectedDate) && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToDate(new Date())}>
                Aujourd'hui
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToDate(subDays(new Date(), 1))}>
              Hier
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToDate(addDays(new Date(), 1))}>
              Demain
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToDate(nextSundayDate)}>
              Dim. prochain
            </Button>
          </div>
        </motion.div>

        {/* ── Liturgical name + zone selector ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-start justify-between gap-3 mb-5"
        >
          <div className="flex-1 min-w-0">
            {liturgicalName ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', LITURGY_COLORS[liturgicalColor] || 'text-primary')}>●</span>
                <p className={cn('font-cinzel text-sm font-semibold', LITURGY_COLORS[liturgicalColor] || 'text-primary')}>
                  {liturgicalName}
                </p>
              </div>
            ) : (
              <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: dateLocale })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={zone} onValueChange={handleZoneChange}>
              <SelectTrigger className="h-7 text-xs w-[140px] border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZONES.map((z) => (
                  <SelectItem key={z.value} value={z.value} className="text-xs">
                    {z.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as OfficeId)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto gap-1 bg-white/5 p-1 mb-6 rounded-lg">
            {OFFICES.map((o) => (
              <TabsTrigger
                key={o.id}
                value={o.id}
                className={cn(
                  'text-xs py-1.5 px-2 rounded data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                  'leading-tight'
                )}
              >
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${dateStr}-${zone}-${activeTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {OFFICES.map((o) => (
                <TabsContent key={o.id} value={o.id} className="mt-0">
                  {activeTab === o.id && renderContent()}
                </TabsContent>
              ))}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
};

// ── OfficeDataRenderer ─────────────────────────────────────────────────────────
const OfficeDataRenderer = ({ data, officeId }: { data: any; officeId: string }) => {
  const office: AelfOffice = data?.[officeId];
  if (!office) {
    return <p className="text-center text-muted-foreground py-16 text-sm">Office non disponible pour cette date.</p>;
  }
  const parties: AelfOfficePartie[] = office.parties || [];
  const lectures: AelfLecture[] = office.lectures || [];
  if (!parties.length && !lectures.length) {
    return <p className="text-center text-muted-foreground py-16 text-sm">Aucun texte disponible.</p>;
  }
  return (
    <div>
      {lectures.map((l, i) => <LectureBlock key={`l${i}`} lecture={l} lang="fr" />)}
      {parties.map((p, i) => <OfficeBlock key={`p${i}`} partie={p} />)}
    </div>
  );
};

export default MesseOffice;
