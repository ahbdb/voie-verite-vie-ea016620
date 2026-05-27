import { useState, useEffect, type ElementType } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Sun, Sunset, Moon, Star, ChevronDown, ChevronUp, Volume2, Square, BookOpen, Loader2 } from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';

// ── AELF API ───────────────────────────────────────────────────────────────

const AELF_BASE = 'https://api.aelf.org/v1';

function detectZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (tz.startsWith('Africa')) return 'afrique';
    if (tz.startsWith('Europe/Brussels')) return 'belgique';
    if (tz.startsWith('America')) return 'canada';
    if (tz.startsWith('Europe/Zurich') || tz.startsWith('Europe/Geneva')) return 'suisse';
  } catch {}
  return 'afrique';
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface AelfLecture {
  type: string;
  titre?: string;
  ref?: string;
  contenu?: string;
}

interface AelfInfo {
  jour_liturgique_nom?: string;
  couleur?: string;
}

interface AelfData {
  messes?: { lectures?: AelfLecture[]; information?: AelfInfo };
  information?: AelfInfo;
}

// ── Static prayers ─────────────────────────────────────────────────────────

interface PrayerBlock {
  id: string;
  title: string;
  subtitle?: string;
  text: string;
  source?: string;
}

type TimeOfDay = 'matin' | 'midi' | 'soir' | 'nuit';

const PRAYERS: Record<TimeOfDay, PrayerBlock[]> = {
  matin: [
    {
      id: 'offrande',
      title: 'Offrande du matin',
      subtitle: 'Commencer la journée en union avec Dieu',
      text: `Ô Jésus, par le Cœur Immaculé de Marie, je vous offre les prières, les travaux, les joies et les souffrances de cette journée, en réparation des péchés, pour les intentions de tous ceux qui prient avec moi, et en union avec le saint Sacrifice de la Messe. Amen.`,
      source: 'Prière traditionnelle',
    },
    {
      id: 'angeGardien',
      title: "Prière à l'Ange Gardien",
      text: `Ange de Dieu, qui êtes mon gardien,
éclairez, gardez, gouvernez et conduisez
la pauvre âme que la bonté divine
vous a confiée.
Amen.`,
      source: 'Prière traditionnelle',
    },
    {
      id: 'psaume23',
      title: 'Psaume 23 — Le Seigneur est mon berger',
      text: `Le Seigneur est mon berger,
je ne manque de rien.
Sur des prés d'herbe fraîche,
il me fait reposer.
Il me mène vers les eaux tranquilles
et me fait revivre.
Il me guide sur les justes chemins
pour l'honneur de son nom.
Si je traverse les ravins de la mort,
je ne crains aucun mal,
car tu es avec moi :
ton bâton me guide et me rassure.`,
      source: 'Ps 23',
    },
    {
      id: 'veniCreator',
      title: 'Viens, Esprit Créateur',
      subtitle: 'Veni Creator Spiritus',
      text: `Viens, Esprit Créateur,
visite l'âme de tes fidèles,
emplis de la grâce d'en haut
les cœurs que tu as créés.
Toi qu'on appelle Consolateur,
don du Dieu très-haut,
source vive, feu, charité,
et doux onction spirituelle.
Enseigne-nous le Père,
fais-nous connaître le Fils,
et toi, l'Esprit des deux,
donne-nous de croire en toi.
Amen.`,
      source: 'Hymne liturgique — IXe siècle',
    },
  ],
  midi: [
    {
      id: 'angelus',
      title: "L'Angélus",
      subtitle: 'Prière mariale de midi',
      text: `V. L'ange du Seigneur a annoncé à Marie.
R. Et elle a conçu du Saint-Esprit.

Je vous salue, Marie, pleine de grâces,
le Seigneur est avec vous.
Vous êtes bénie entre toutes les femmes,
et Jésus, le fruit de vos entrailles, est béni.
Sainte Marie, Mère de Dieu,
priez pour nous, pauvres pécheurs,
maintenant et à l'heure de notre mort. Amen.

V. Voici la servante du Seigneur.
R. Qu'il me soit fait selon votre parole.

(Je vous salue, Marie…)

V. Et le Verbe s'est fait chair.
R. Et il a habité parmi nous.

(Je vous salue, Marie…)

V. Priez pour nous, sainte Mère de Dieu.
R. Afin que nous soyons rendus dignes des promesses de Jésus-Christ.

Prions : Répands, Seigneur, ta grâce en nos âmes,
afin que nous qui avons connu,
par le message de l'ange,
l'Incarnation de ton Fils Jésus-Christ,
nous arrivions par sa Passion et sa Croix
à la gloire de la Résurrection.
Par Jésus-Christ, Notre Seigneur. Amen.`,
      source: 'XIIe siècle',
    },
    {
      id: 'memorare',
      title: 'Mémoraré',
      text: `Souvenez-vous, ô très miséricordieuse Vierge Marie,
qu'on n'a jamais entendu dire qu'aucun de ceux
qui ont eu recours à votre protection,
imploré votre assistance ou réclamé votre intercession
ait été abandonné.
Animé de cette confiance, je cours vers vous,
ô Vierge des vierges, ma Mère.
Je viens à vous et, pécheur repentant,
je me prosterne en gémissant à vos pieds.
Ô Mère du Verbe incarné, ne méprisez pas mes prières,
mais écoutez-les favorablement et daignez les exaucer.
Amen.`,
      source: 'Saint Bernard de Clairvaux',
    },
    {
      id: 'gloire',
      title: 'Gloire au Père',
      text: `Gloire au Père, au Fils et au Saint-Esprit,
comme il était au commencement, maintenant et toujours,
dans les siècles des siècles. Amen.`,
      source: 'Prière liturgique',
    },
  ],
  soir: [
    {
      id: 'examen',
      title: 'Examen de conscience du soir',
      text: `Seigneur, je m'arrête un instant devant toi.
Merci pour cette journée qui s'achève.
Je te rends grâce pour tous les moments de joie,
pour les personnes que j'ai rencontrées,
pour les biens que tu m'as accordés.

Je te demande pardon pour les fois où j'ai failli :
les impatiences, les paroles blessantes,
les pensées égoïstes, les occasions de bien manquées.

Garde-moi cette nuit, et que ton Esprit veille sur moi.
Amen.`,
      source: 'Prière traditionnelle',
    },
    {
      id: 'confiteor',
      title: 'Confiteor — Acte de contrition',
      text: `Je confesse à Dieu tout-puissant,
je reconnais devant mes frères,
que j'ai péché en pensée, en parole,
par action et par omission ;
oui, j'ai vraiment péché.
C'est pourquoi je supplie la bienheureuse Vierge Marie,
les anges et tous les saints,
et vous aussi, mes frères,
de prier pour moi le Seigneur notre Dieu.`,
      source: 'Rite romain',
    },
    {
      id: 'completoire',
      title: 'Hymne des Complies — Into manus',
      text: `En tes mains, Seigneur, je remets mon esprit.
Tu nous as rachetés, Seigneur, Dieu de vérité.
Tu as fait de moi la joie et l'allégresse,
et je peux te glorifier nuit et jour.

Garde-moi, Seigneur, comme la prunelle de l'œil,
à l'ombre de tes ailes, protège-moi.

Que la nuit soit douce et le repos réparateur,
afin que demain nous soyons prêts à te servir.
Amen.`,
      source: 'Liturgie des Heures',
    },
    {
      id: 'rosaire-soir',
      title: 'Invitation au Rosaire',
      text: `Ce soir, confiez-vous à la Vierge Marie
en méditant un mystère du Saint Rosaire.
Commencez par le Notre Père,
puis dix Ave Maria en contemplant le mystère,
et terminez par le Gloire au Père.

Notre Père, qui es aux cieux,
que ton nom soit sanctifié,
que ton règne vienne,
que ta volonté soit faite sur la terre comme au ciel.
Donne-nous aujourd'hui notre pain de ce jour.
Pardonne-nous nos offenses,
comme nous pardonnons aussi à ceux qui nous ont offensés.
Et ne nous laisse pas entrer en tentation,
mais délivre-nous du Mal.
Amen.`,
      source: 'Invitation à la prière',
    },
  ],
  nuit: [
    {
      id: 'benediction',
      title: 'Bénédiction du soir',
      text: `Que le Seigneur vous bénisse et vous garde.
Que le Seigneur fasse briller sur vous son visage,
qu'il vous soit favorable.
Que le Seigneur vous montre son visage
et vous donne la paix.
Amen.`,
      source: 'Nombres 6, 24-26',
    },
    {
      id: 'dormir',
      title: 'Prière avant de dormir',
      text: `Seigneur, je me confie entre tes mains
pour la nuit qui vient.
Garde mon âme et mon corps.
Que tes anges m'entourent pendant mon repos
et que je me réveille demain avec la grâce
de te servir fidèlement.

Dans tes mains, Seigneur,
je remets mon esprit. Amen.`,
      source: 'Ps 31, 6',
    },
    {
      id: 'salve',
      title: 'Salve Regina',
      subtitle: 'Reine du Ciel, notre espérance',
      text: `Salve Regina, Mère de miséricorde,
notre vie, notre douceur, notre espérance, salut !
Vers vous nous crions, pauvres enfants d'Ève exilés.
Vers vous nous soupirons, gémissant et pleurant
dans cette vallée de larmes.
Ô vous, notre avocate, tournez vers nous
vos yeux miséricordieux.
Et après cet exil, montrez-nous Jésus,
le fruit béni de vos entrailles.
Ô clémente, ô pieuse, ô douce Vierge Marie.
Amen.`,
      source: 'Antiphon mariale — XIe siècle',
    },
  ],
};

const TIME_CONFIG: Record<TimeOfDay, { label: string; icon: React.ElementType; color: string; bgClass: string; borderClass: string; description: string }> = {
  matin: { label: 'Matin', icon: Sun,     color: 'text-amber-500',  bgClass: 'bg-amber-50 dark:bg-amber-900/20',    borderClass: 'border-amber-200 dark:border-amber-800', description: '6h — 12h' },
  midi:  { label: 'Midi',  icon: Sunset,  color: 'text-orange-500', bgClass: 'bg-orange-50 dark:bg-orange-900/20',  borderClass: 'border-orange-200 dark:border-orange-800', description: '12h — 18h' },
  soir:  { label: 'Soir',  icon: Moon,    color: 'text-indigo-500', bgClass: 'bg-indigo-50 dark:bg-indigo-900/20',  borderClass: 'border-indigo-200 dark:border-indigo-800', description: '18h — 21h' },
  nuit:  { label: 'Nuit',  icon: Star,    color: 'text-violet-500', bgClass: 'bg-violet-50 dark:bg-violet-900/20',  borderClass: 'border-violet-200 dark:border-violet-800', description: '21h — 6h' },
};

function getDefaultTime(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'matin';
  if (h >= 12 && h < 18) return 'midi';
  if (h >= 18 && h < 22) return 'soir';
  return 'nuit';
}

// ── Component ──────────────────────────────────────────────────────────────

const PriereQuotidienne = () => {
  const { t } = useTranslation();
  const { speak, stop, speaking, supported } = useSpeech(0.8);

  const [activeTime, setActiveTime] = useState<TimeOfDay>(getDefaultTime);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // AELF state
  const [gospel, setGospel] = useState<AelfLecture | null>(null);
  const [liturgicalDay, setLiturgicalDay] = useState<string>('');
  const [aelfLoading, setAelfLoading] = useState(true);
  const [aelfError, setAelfError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const zone = detectZone();
    const date = getTodayStr();
    setAelfLoading(true);
    setAelfError(false);

    fetch(`${AELF_BASE}/messes/${date}/${zone}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('aelf error');
        return r.json() as Promise<AelfData>;
      })
      .then((data) => {
        const info = data?.messes?.information ?? data?.information;
        if (info?.jour_liturgique_nom) setLiturgicalDay(info.jour_liturgique_nom);

        const lectures = data?.messes?.lectures ?? [];
        const evangile = lectures.find(
          (l) => l.type?.toLowerCase().includes('evangile') || l.type?.toLowerCase().includes('évangile'),
        );
        if (evangile) setGospel(evangile);
        setAelfLoading(false);
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setAelfError(true);
          setAelfLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const handleSpeak = (prayer: PrayerBlock) => {
    if (speakingId === prayer.id) {
      stop();
      setSpeakingId(null);
    } else {
      stop();
      setSpeakingId(prayer.id);
      speak(`${prayer.title}. ${prayer.text}`, () => setSpeakingId(null));
    }
  };

  const prayers = PRAYERS[activeTime];
  const cfg = TIME_CONFIG[activeTime];
  const Icon = cfg.icon;

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Prière du Jour — Voie Vérité Vie</title>
        <meta name="description" content="Prières liturgiques du jour et Évangile selon l'AELF." />
      </Helmet>
      <Navigation />

      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 text-center px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <BookOpen className="h-3.5 w-3.5 text-cathedral-gold" />
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">{t('dailyPrayer.badge')}</span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-4">{t('dailyPrayer.title')}</h1>
          <div className="cathedral-line w-24 h-px mx-auto my-4" />
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">{t('dailyPrayer.subtitle')}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Gospel of the Day ── */}
        <section className="rounded-2xl border border-cathedral-gold/30 bg-cathedral-gold/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cathedral-gold" />
            <h2 className="font-cinzel font-bold text-foreground text-base">{t('dailyPrayer.gospelOfDay')}</h2>
          </div>
          {liturgicalDay && (
            <p className="text-xs text-cathedral-gold font-semibold uppercase tracking-wider">{liturgicalDay}</p>
          )}

          {aelfLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('dailyPrayer.loadingGospel')}
            </div>
          ) : aelfError || !gospel ? (
            <p className="text-sm text-muted-foreground italic">{t('dailyPrayer.gospelError')}</p>
          ) : (
            <div className="space-y-2">
              {gospel.ref && (
                <p className="text-cathedral-gold text-xs font-bold">{gospel.ref}</p>
              )}
              {gospel.titre && (
                <p className="font-semibold text-foreground text-sm">{gospel.titre}</p>
              )}
              {gospel.contenu && (
                <div className="text-sm text-muted-foreground leading-relaxed max-h-48 overflow-y-auto pr-1 border-l-2 border-cathedral-gold/30 pl-3">
                  <p className="whitespace-pre-line font-['Playfair_Display',serif] italic">
                    {stripHtml(gospel.contenu).slice(0, 800)}{gospel.contenu.length > 800 ? '…' : ''}
                  </p>
                </div>
              )}
              {supported && gospel.contenu && (
                <button
                  onClick={() => {
                    if (speakingId === 'gospel') { stop(); setSpeakingId(null); }
                    else { stop(); setSpeakingId('gospel'); speak(stripHtml(gospel.contenu ?? ''), () => setSpeakingId(null)); }
                  }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${speakingId === 'gospel' ? 'text-cathedral-gold border-cathedral-gold/40 bg-cathedral-gold/10' : 'text-muted-foreground border-border hover:border-border/80'}`}
                >
                  {speakingId === 'gospel' ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  {speakingId === 'gospel' ? t('dailyPrayer.stop') : t('dailyPrayer.listen')}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Time-of-day selector ── */}
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(TIME_CONFIG) as TimeOfDay[]).map((t_key) => {
            const c = TIME_CONFIG[t_key];
            const TIcon = c.icon;
            return (
              <button
                key={t_key}
                onClick={() => setActiveTime(t_key)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-3 transition-all ${activeTime === t_key ? `${c.bgClass} ${c.borderClass}` : 'border-border/60 bg-card hover:border-border'}`}
              >
                <TIcon className={`h-5 w-5 ${activeTime === t_key ? c.color : 'text-muted-foreground'}`} />
                <span className={`text-xs font-bold ${activeTime === t_key ? c.color : 'text-muted-foreground'}`}>{c.label}</span>
                <span className="text-[9px] text-muted-foreground hidden sm:block">{c.description}</span>
              </button>
            );
          })}
        </div>

        {/* ── Prayers accordion ── */}
        <div className="space-y-3">
          <h2 className="font-cinzel font-bold text-foreground text-base flex items-center gap-2">
            <Icon className={`h-4 w-4 ${cfg.color}`} />
            {t(`dailyPrayer.${activeTime}`)}
          </h2>
          {prayers.map((prayer) => {
            const isOpen = expanded === prayer.id;
            const isPlaying = speakingId === prayer.id;
            return (
              <div
                key={prayer.id}
                className={`rounded-2xl border transition-all ${isOpen ? `${cfg.borderClass} ${cfg.bgClass}` : 'border-border/60 bg-card hover:border-border/80'}`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : prayer.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-cinzel font-bold text-foreground text-sm">{prayer.title}</p>
                    {prayer.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{prayer.subtitle}</p>}
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 space-y-3">
                    <p className="text-sm text-foreground leading-loose whitespace-pre-line font-['Playfair_Display',serif]">
                      {prayer.text}
                    </p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {prayer.source && (
                        <span className="text-xs text-muted-foreground italic">{prayer.source}</span>
                      )}
                      {supported && (
                        <button
                          onClick={() => handleSpeak(prayer)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${isPlaying ? `${cfg.color} ${cfg.borderClass} ${cfg.bgClass}` : 'text-muted-foreground border-border hover:border-border/80'}`}
                        >
                          {isPlaying ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                          {isPlaying ? t('dailyPrayer.stop') : t('dailyPrayer.listen')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Scriptural verse footer ── */}
        <div className="rounded-2xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-5 text-center">
          <p className="font-['Playfair_Display',serif] text-sm italic text-foreground/80">
            « Priez sans cesse. En toute chose, rendez grâce. »
          </p>
          <p className="text-xs text-cathedral-gold font-semibold mt-2">1 Thessaloniciens 5, 17-18</p>
        </div>
      </main>
    </div>
  );
};

export default PriereQuotidienne;
