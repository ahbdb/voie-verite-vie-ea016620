import { useState, useMemo, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, CheckCircle2, Circle, Volume2, VolumeX, Play, Square } from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';

type MysteryType = 'joyeux' | 'lumineux' | 'douloureux' | 'glorieux';

interface Mystery {
  title: string;
  mysteries: string[];
  days: string;
  color: string;
  bgClass: string;
  borderClass: string;
  emoji: string;
}

const MYSTERIES: Record<MysteryType, Mystery> = {
  joyeux: {
    title: 'Mystères Joyeux',
    days: 'Lundi & Samedi',
    emoji: '⭐',
    color: 'text-amber-600',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    mysteries: [
      "L'Annonciation de l'Ange Gabriel à Marie",
      "La Visitation de Marie à Élisabeth",
      "La Nativité de Jésus à Bethléem",
      "La Présentation de Jésus au Temple",
      "Le Recouvrement de Jésus au Temple",
    ],
  },
  lumineux: {
    title: 'Mystères Lumineux',
    days: 'Jeudi',
    emoji: '✨',
    color: 'text-sky-600',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/30',
    mysteries: [
      "Le Baptême de Jésus au Jourdain",
      "Les Noces de Cana",
      "L'Annonce du Royaume de Dieu",
      "La Transfiguration de Jésus",
      "L'Institution de l'Eucharistie",
    ],
  },
  douloureux: {
    title: 'Mystères Douloureux',
    days: 'Mardi & Vendredi',
    emoji: '✝️',
    color: 'text-rose-600',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    mysteries: [
      "L'Agonie de Jésus au Jardin des Oliviers",
      "La Flagellation de Jésus",
      "Le Couronnement d'épines",
      "Le Portement de la Croix",
      "La Crucifixion et la Mort de Jésus",
    ],
  },
  glorieux: {
    title: 'Mystères Glorieux',
    days: 'Mercredi & Dimanche',
    emoji: '👑',
    color: 'text-emerald-600',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    mysteries: [
      "La Résurrection de Jésus",
      "L'Ascension de Jésus au Ciel",
      "La Pentecôte",
      "L'Assomption de Marie",
      "Le Couronnement de Marie comme Reine du Ciel",
    ],
  },
};

const MYSTERY_ORDER: MysteryType[] = ['joyeux', 'lumineux', 'douloureux', 'glorieux'];

const getDayMystery = (): MysteryType => {
  const day = new Date().getDay();
  if (day === 0 || day === 3) return 'glorieux';
  if (day === 1 || day === 6) return 'joyeux';
  if (day === 2 || day === 5) return 'douloureux';
  return 'lumineux';
};

const PRAYERS = {
  credo: `Je crois en Dieu, le Père tout-puissant, Créateur du ciel et de la terre, et en Jésus-Christ, son Fils unique, notre Seigneur, qui a été conçu du Saint-Esprit, est né de la Vierge Marie, a souffert sous Ponce Pilate, a été crucifié, est mort et a été enseveli, est descendu aux enfers, le troisième jour est ressuscité des morts, est monté aux cieux, est assis à la droite de Dieu le Père tout-puissant, d'où il viendra juger les vivants et les morts. Je crois en l'Esprit-Saint, à la sainte Église catholique, à la communion des saints, à la rémission des péchés, à la résurrection de la chair, à la vie éternelle. Amen.`,
  pater: `Notre Père, qui es aux cieux, que ton nom soit sanctifié, que ton règne vienne, que ta volonté soit faite sur la terre comme au ciel. Donne-nous aujourd'hui notre pain de ce jour, pardonne-nous nos offenses comme nous pardonnons aussi à ceux qui nous ont offensés, et ne nous soumets pas à la tentation, mais délivre-nous du mal. Amen.`,
  ave: `Je vous salue, Marie, pleine de grâce ; le Seigneur est avec vous. Vous êtes bénie entre toutes les femmes et Jésus, le fruit de vos entrailles, est béni. Sainte Marie, Mère de Dieu, priez pour nous, pauvres pécheurs, maintenant et à l'heure de notre mort. Amen.`,
  gloria: `Gloire au Père, et au Fils, et au Saint-Esprit, comme il était au commencement, maintenant et toujours, dans les siècles des siècles. Amen.`,
  fatima: `Ô mon Jésus, pardonnez-nous nos péchés, préservez-nous du feu de l'enfer, conduisez au ciel toutes les âmes, surtout celles qui ont le plus besoin de votre miséricorde. Amen.`,
  salve: `Salve, Regina, Mater misericordiae ! Vita, dulcedo et spes nostra, salve ! Ad te clamamus, exsules filii Hevae. Ad te suspiramus gementes et flentes in hac lacrymarum valle. Eia ergo, Advocata nostra, illos tuos misericordes oculos ad nos converte. Et Jesum benedictum fructum ventris tui, nobis post hoc exsilium ostende. O clemens, o pia, o dulcis Virgo Maria !`,
};

// Display versions with line breaks (for card text)
const PRAYERS_DISPLAY: Record<string, string> = {
  credo: `Je crois en Dieu, le Père tout-puissant, Créateur du ciel et de la terre,\net en Jésus-Christ, son Fils unique, notre Seigneur,\nqui a été conçu du Saint-Esprit, est né de la Vierge Marie,\na souffert sous Ponce Pilate, a été crucifié, est mort et a été enseveli,\nest descendu aux enfers, le troisième jour est ressuscité des morts,\nest monté aux cieux, est assis à la droite de Dieu le Père tout-puissant,\nd'où il viendra juger les vivants et les morts.\nJe crois en l'Esprit-Saint, à la sainte Église catholique,\nà la communion des saints, à la rémission des péchés,\nà la résurrection de la chair, à la vie éternelle. Amen.`,
  pater: `Notre Père, qui es aux cieux,\nque ton nom soit sanctifié,\nque ton règne vienne,\nque ta volonté soit faite sur la terre comme au ciel.\nDonne-nous aujourd'hui notre pain de ce jour,\npardonne-nous nos offenses\ncomme nous pardonnons aussi à ceux qui nous ont offensés,\net ne nous soumets pas à la tentation,\nmais délivre-nous du mal. Amen.`,
  ave: `Je vous salue, Marie, pleine de grâce ;\nle Seigneur est avec vous.\nVous êtes bénie entre toutes les femmes\net Jésus, le fruit de vos entrailles, est béni.\nSainte Marie, Mère de Dieu,\npriez pour nous, pauvres pécheurs,\nmaintenant et à l'heure de notre mort. Amen.`,
  gloria: `Gloire au Père, et au Fils, et au Saint-Esprit,\ncomme il était au commencement, maintenant et toujours,\ndans les siècles des siècles. Amen.`,
  fatima: `Ô mon Jésus, pardonnez-nous nos péchés,\npréservez-nous du feu de l'enfer,\nconduisez au ciel toutes les âmes,\nsurtout celles qui ont le plus besoin de votre miséricorde. Amen.`,
  salve: `Salve, Regina, Mater misericordiae !\nVita, dulcedo et spes nostra, salve !\nAd te clamamus, exsules filii Hevae.\nAd te suspiramus gementes et flentes in hac lacrymarum valle.\nEia ergo, Advocata nostra,\nillos tuos misericordes oculos ad nos converte.\nEt Jesum benedictum fructum ventris tui,\nnobis post hoc exsilium ostende.\nO clemens, o pia, o dulcis Virgo Maria !`,
};

type Phase = 'credo' | 'pater-intro' | 'ave-intro' | 'gloria-intro' | 'mystery' | 'pater' | 'ave' | 'gloria' | 'fatima' | 'salve' | 'done';

interface RosaryState {
  mysteryType: MysteryType;
  mysteryIndex: number;
  phase: Phase;
  aveCount: number;
}

const Chapelet = () => {
  const suggestedMystery = useMemo(getDayMystery, []);
  const [mysteryType, setMysteryType] = useState<MysteryType>(suggestedMystery);
  const [started, setStarted] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [state, setState] = useState<RosaryState>({ mysteryType: suggestedMystery, mysteryIndex: 0, phase: 'credo', aveCount: 0 });
  const [completed, setCompleted] = useState(false);

  const { speak, stop, speaking, supported } = useSpeech(0.8);
  const mystery = MYSTERIES[state.mysteryType];

  const startRosary = () => {
    setState({ mysteryType, mysteryIndex: 0, phase: 'credo', aveCount: 0 });
    setStarted(true);
    setCompleted(false);
  };

  const getPrayerText = useCallback((s: RosaryState): string => {
    const { phase, aveCount, mysteryIndex } = s;
    const m = MYSTERIES[s.mysteryType].mysteries[mysteryIndex];
    switch (phase) {
      case 'credo': return PRAYERS.credo;
      case 'pater-intro': return PRAYERS.pater;
      case 'ave-intro': return PRAYERS.ave;
      case 'gloria-intro': return PRAYERS.gloria;
      case 'mystery': return `Méditons sur le ${mysteryIndex + 1}er mystère : ${m}`;
      case 'pater': return PRAYERS.pater;
      case 'ave': return PRAYERS.ave;
      case 'gloria': return PRAYERS.gloria;
      case 'fatima': return PRAYERS.fatima;
      case 'salve': return PRAYERS.salve;
      default: return '';
    }
  }, []);

  const advance = useCallback(() => {
    setState((prev) => {
      const { phase, aveCount, mysteryIndex } = prev;
      let next: RosaryState = prev;

      if (phase === 'credo')        next = { ...prev, phase: 'pater-intro' };
      else if (phase === 'pater-intro') next = { ...prev, phase: 'ave-intro' };
      else if (phase === 'ave-intro')   next = { ...prev, phase: 'gloria-intro' };
      else if (phase === 'gloria-intro') next = { ...prev, phase: 'mystery', mysteryIndex: 0 };
      else if (phase === 'mystery') next = { ...prev, phase: 'pater' };
      else if (phase === 'pater')   next = { ...prev, phase: 'ave', aveCount: 0 };
      else if (phase === 'ave') {
        if (aveCount < 9) next = { ...prev, aveCount: aveCount + 1 };
        else              next = { ...prev, phase: 'gloria' };
      }
      else if (phase === 'gloria') next = { ...prev, phase: 'fatima' };
      else if (phase === 'fatima') {
        if (mysteryIndex < 4) next = { ...prev, phase: 'mystery', mysteryIndex: mysteryIndex + 1 };
        else                  next = { ...prev, phase: 'salve' };
      }
      else if (phase === 'salve') next = { ...prev, phase: 'done' };

      return next;
    });
  }, []);

  // Auto-read when phase changes
  useEffect(() => {
    if (!started || !autoRead || state.phase === 'done') return;
    const text = getPrayerText(state);
    if (text) speak(text);
  }, [state.phase, state.aveCount, state.mysteryIndex, started, autoRead]);

  useEffect(() => {
    if (state.phase === 'done') { setCompleted(true); stop(); }
  }, [state.phase]);

  const getPhaseInfo = () => {
    const { phase, aveCount, mysteryIndex } = state;
    const m = mystery.mysteries[mysteryIndex];
    switch (phase) {
      case 'credo':       return { title: 'Credo', subtitle: 'Début du chapelet', display: PRAYERS_DISPLAY.credo, button: 'Continuer →' };
      case 'pater-intro': return { title: 'Notre Père', subtitle: '1er chapelet — introduction', display: PRAYERS_DISPLAY.pater, button: 'Continuer →' };
      case 'ave-intro':   return { title: 'Je vous salue Marie', subtitle: '3 Ave Maria', display: PRAYERS_DISPLAY.ave, button: 'Continuer →' };
      case 'gloria-intro':return { title: 'Gloire au Père', subtitle: 'Doxologie', display: PRAYERS_DISPLAY.gloria, button: 'Commencer les mystères →' };
      case 'mystery':     return { title: `${mysteryIndex + 1}er Mystère`, subtitle: m, display: `Méditons sur :\n\n${m}`, button: 'Prier le Notre Père →' };
      case 'pater':       return { title: 'Notre Père', subtitle: `Mystère ${mysteryIndex + 1} sur 5`, display: PRAYERS_DISPLAY.pater, button: 'Commencer les Ave Maria →' };
      case 'ave':         return { title: `Ave Maria ${aveCount + 1}/10`, subtitle: `Mystère ${mysteryIndex + 1} — ${m}`, display: PRAYERS_DISPLAY.ave, button: aveCount < 9 ? `Ave Maria suivant (${aveCount + 2}/10) →` : 'Gloire au Père →' };
      case 'gloria':      return { title: 'Gloire au Père', subtitle: `Fin du mystère ${mysteryIndex + 1}`, display: PRAYERS_DISPLAY.gloria, button: 'Oraison de Fatima →' };
      case 'fatima':      return { title: 'Oraison de Fatima', subtitle: `Mystère ${mysteryIndex + 1} terminé`, display: PRAYERS_DISPLAY.fatima, button: mysteryIndex < 4 ? `Mystère ${mysteryIndex + 2} →` : 'Salve Regina →' };
      case 'salve':       return { title: 'Salve Regina', subtitle: 'Fin du chapelet', display: PRAYERS_DISPLAY.salve, button: 'Terminer ✓' };
      default:            return { title: '', subtitle: '', display: '', button: '' };
    }
  };

  const getProgress = () => {
    const { phase, aveCount, mysteryIndex } = state;
    const total = 4 + 5 * 13 + 1;
    let s = 0;
    const ordered: Phase[] = ['credo', 'pater-intro', 'ave-intro', 'gloria-intro', 'mystery', 'pater', 'ave', 'gloria', 'fatima', 'salve', 'done'];
    const idx = ordered.indexOf(phase);
    if (idx >= 1) s += 1;
    if (idx >= 2) s += 1;
    if (idx >= 3) s += 1;
    if (idx >= 4) s += 1;
    s += mysteryIndex * 13;
    if (['pater', 'ave', 'gloria', 'fatima'].includes(phase)) s += 1;
    if (['ave', 'gloria', 'fatima'].includes(phase)) s += 1 + aveCount;
    if (phase === 'gloria') s += 11;
    if (phase === 'fatima') s += 12;
    if (phase === 'salve')  s += 4 * 13;
    return Math.min(Math.round((s / total) * 100), 99);
  };

  const phaseInfo = started && state.phase !== 'done' ? getPhaseInfo() : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Chapelet — Voie Vérité Vie</title>
        <meta name="description" content="Priez le chapelet guidé étape par étape avec les mystères du jour." />
      </Helmet>
      <Navigation />

      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 text-center px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <span className="text-cathedral-gold text-sm">📿</span>
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">Prière mariale</span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-4">Chapelet</h1>
          <div className="cathedral-line w-24 h-px mx-auto my-4" />
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Méditez les mystères de la foi guidé pas à pas. Le Saint Rosaire est une prière contemplative qui unit le cœur à Marie.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {!started ? (
          <>
            <div className="rounded-2xl border border-cathedral-gold/20 bg-card p-6">
              <h2 className="font-cinzel font-bold text-foreground text-lg mb-1">Choisir les mystères</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Suggestion du jour ({new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}) :{' '}
                <span className="font-semibold text-foreground">{MYSTERIES[suggestedMystery].title}</span>
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {MYSTERY_ORDER.map((key) => {
                  const m = MYSTERIES[key];
                  const isSelected = mysteryType === key;
                  return (
                    <button key={key} onClick={() => setMysteryType(key)} className={`rounded-xl border p-4 text-left transition-all ${isSelected ? `${m.bgClass} ${m.borderClass}` : 'border-border/60 hover:border-border'}`}>
                      <div className="text-2xl mb-1">{m.emoji}</div>
                      <div className={`font-cinzel font-bold text-sm ${isSelected ? m.color : 'text-foreground'}`}>{m.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.days}</div>
                    </button>
                  );
                })}
              </div>

              {supported && (
                <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-border/60 bg-muted/20 p-3">
                  <input type="checkbox" checked={autoRead} onChange={(e) => setAutoRead(e.target.checked)} className="rounded" />
                  <Volume2 className="h-4 w-4 text-cathedral-gold shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Lecture vocale automatique</div>
                    <div className="text-xs text-muted-foreground">Chaque prière sera lue à voix haute</div>
                  </div>
                </label>
              )}
            </div>

            <div className={`rounded-2xl border ${MYSTERIES[mysteryType].borderClass} ${MYSTERIES[mysteryType].bgClass} p-6`}>
              <h3 className={`font-cinzel font-bold ${MYSTERIES[mysteryType].color} mb-3`}>{MYSTERIES[mysteryType].title}</h3>
              <ol className="space-y-2">
                {MYSTERIES[mysteryType].mysteries.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className={`font-bold ${MYSTERIES[mysteryType].color} shrink-0`}>{i + 1}.</span>
                    {m}
                  </li>
                ))}
              </ol>
            </div>

            <Button onClick={startRosary} className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold rounded-xl py-5 text-base">
              📿 Commencer le chapelet
            </Button>
          </>
        ) : completed ? (
          <div className="rounded-2xl border border-cathedral-gold/30 bg-card p-10 text-center space-y-4">
            <div className="text-5xl">🙏</div>
            <h2 className="font-cinzel text-2xl font-bold text-foreground">Chapelet terminé</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Que Marie intercède pour vous et vous accompagne dans toutes vos intentions. Amen.
            </p>
            <Button variant="outline" onClick={() => setStarted(false)} className="rounded-xl gap-2">
              <RotateCcw className="h-4 w-4" /> Nouveau chapelet
            </Button>
          </div>
        ) : phaseInfo ? (
          <>
            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mystery.title}</span>
                <span>{getProgress()}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-cathedral-gold transition-all duration-500" style={{ width: `${getProgress()}%` }} />
              </div>
            </div>

            {/* Ave bead counter */}
            {state.phase === 'ave' && (
              <div className="flex items-center justify-center gap-1.5 flex-wrap py-1">
                {Array.from({ length: 10 }).map((_, i) =>
                  i <= state.aveCount
                    ? <CheckCircle2 key={i} className="h-5 w-5 text-cathedral-gold" />
                    : <Circle key={i} className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
            )}

            {/* Prayer card */}
            <div className="rounded-2xl border border-cathedral-gold/30 bg-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className="text-cathedral-gold border-cathedral-gold/40 rounded-full text-xs mb-2">{phaseInfo.subtitle}</Badge>
                  <h2 className="font-cinzel text-xl font-bold text-foreground">{phaseInfo.title}</h2>
                </div>

                {/* Voice controls */}
                {supported && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => speaking ? stop() : speak(getPrayerText(state))}
                      title={speaking ? 'Arrêter' : 'Écouter'}
                      className={`p-2 rounded-full transition-colors border ${speaking ? 'text-cathedral-gold border-cathedral-gold/40 bg-cathedral-gold/10' : 'text-muted-foreground border-border hover:border-border/80 hover:text-foreground'}`}
                    >
                      {speaking ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setAutoRead((v) => !v)}
                      title={autoRead ? 'Désactiver lecture auto' : 'Activer lecture auto'}
                      className={`p-2 rounded-full transition-colors border ${autoRead ? 'text-cathedral-gold border-cathedral-gold/40 bg-cathedral-gold/10' : 'text-muted-foreground border-border hover:border-border/80 hover:text-foreground'}`}
                    >
                      {autoRead ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="relative rounded-xl bg-muted/40 p-5">
                <span className="absolute top-2 left-3 text-3xl font-serif text-cathedral-gold/20 leading-none select-none">"</span>
                <p className="font-['Playfair_Display',serif] text-sm text-foreground/90 leading-relaxed whitespace-pre-line italic relative z-10">
                  {state.phase === 'mystery' ? mystery.mysteries[state.mysteryIndex] : phaseInfo.display}
                </p>
              </div>

              {speaking && (
                <div className="flex items-center gap-2 text-xs text-cathedral-gold">
                  <span className="flex gap-0.5">
                    {[0,1,2].map((i) => (
                      <span key={i} className="w-1 rounded-full bg-cathedral-gold animate-bounce" style={{ height: '12px', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                  Lecture en cours...
                </div>
              )}

              <Button onClick={advance} className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold rounded-xl">
                {phaseInfo.button}
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => { stop(); setStarted(false); setCompleted(false); }} className="w-full text-muted-foreground text-xs">
              Arrêter le chapelet
            </Button>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default Chapelet;
