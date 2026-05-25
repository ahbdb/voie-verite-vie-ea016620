import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAudio } from '@/hooks/useAudio';
import { Volume2, Square, ChevronRight, ChevronLeft, BookOpen, RotateCcw, Play, Pause } from 'lucide-react';

// ── Canonical prayer texts (Notre Père: réforme de la CEF 2017) ────────────

const NOTRE_PERE = `Notre Père, qui es aux cieux,
que ton nom soit sanctifié,
que ton règne vienne,
que ta volonté soit faite sur la terre comme au ciel.
Donne-nous aujourd'hui notre pain de ce jour.
Pardonne-nous nos offenses,
comme nous pardonnons aussi à ceux qui nous ont offensés.
Et ne nous laisse pas entrer en tentation,
mais délivre-nous du Mal.
Amen.`;

const JE_VOUS_SALUE = `Je vous salue, Marie, pleine de grâces,
le Seigneur est avec vous.
Vous êtes bénie entre toutes les femmes,
et Jésus, le fruit de vos entrailles, est béni.
Sainte Marie, Mère de Dieu,
priez pour nous, pauvres pécheurs,
maintenant et à l'heure de notre mort.
Amen.`;

const GLOIRE_AU_PERE = `Gloire au Père, au Fils et au Saint-Esprit,
comme il était au commencement, maintenant et toujours,
dans les siècles des siècles. Amen.`;

const O_MON_JESUS = `Ô mon bon et doux Jésus, pardonnez-nous nos péchés,
préservez-nous du feu de l'enfer,
attirez au ciel toutes les âmes,
secourez spécialement celles qui ont le plus besoin de votre miséricorde.`;

const JE_CROIS_EN_DIEU = `Je crois en Dieu, le Père tout-puissant,
Créateur du ciel et de la terre.
Et en Jésus-Christ, son Fils unique, notre Seigneur,
qui a été conçu du Saint-Esprit,
est né de la Vierge Marie,
a souffert sous Ponce Pilate,
a été crucifié, est mort et a été enseveli,
est descendu aux enfers,
le troisième jour est ressuscité des morts,
est monté aux cieux,
est assis à la droite de Dieu le Père tout-puissant,
d'où il viendra juger les vivants et les morts.
Je crois au Saint-Esprit,
à la Sainte Église catholique,
à la communion des saints,
à la rémission des péchés,
à la résurrection de la chair,
à la vie éternelle.
Amen.`;

const SALVE_REGINA = `Salve Regina, Mère de miséricorde,
notre vie, notre douceur, notre espérance, salut !
Vers vous nous crions, pauvres enfants d'Ève exilés.
Vers vous nous soupirons, gémissant et pleurant
dans cette vallée de larmes.
Ô vous, notre avocate, tournez vers nous
vos yeux miséricordieux.
Et après cet exil, montrez-nous Jésus,
le fruit béni de vos entrailles.
Ô clémente, ô pieuse, ô douce Vierge Marie.
Amen.`;

// ── Mystery definitions ────────────────────────────────────────────────────

interface Mystery {
  title: string;
  fruit: string;
  scripture: string;
  scriptureText: string;
}

interface MysterySet {
  key: string;
  label: string;
  days: string;
  mysteries: Mystery[];
}

const MYSTERY_SETS: MysterySet[] = [
  {
    key: 'joyful',
    label: 'Mystères Joyeux',
    days: 'Lundi & Samedi',
    mysteries: [
      {
        title: "L'Annonciation",
        fruit: "L'humilité",
        scripture: 'Lc 1, 26-38',
        scriptureText: "L'ange Gabriel fut envoyé par Dieu dans une ville de Galilée, appelée Nazareth, à une vierge fiancée à un homme de la maison de David, nommé Joseph. Le nom de la vierge était Marie.",
      },
      {
        title: 'La Visitation',
        fruit: "L'amour du prochain",
        scripture: 'Lc 1, 39-56',
        scriptureText: "Dès qu'Élisabeth entendit la salutation de Marie, l'enfant tressaillit en elle. Élisabeth fut remplie de l'Esprit Saint et s'écria : Tu es bénie entre toutes les femmes et le fruit de tes entrailles est béni !",
      },
      {
        title: 'La Nativité de Jésus',
        fruit: "L'esprit de pauvreté et le détachement des biens",
        scripture: 'Lc 2, 1-20',
        scriptureText: "Elle enfanta son fils premier-né, l'emmaillota et le coucha dans une mangeoire, parce qu'il n'y avait pas de place pour eux dans la salle commune.",
      },
      {
        title: 'La Présentation de Jésus au Temple',
        fruit: "L'obéissance et la pureté",
        scripture: 'Lc 2, 22-40',
        scriptureText: "Syméon prit l'enfant dans ses bras et bénit Dieu : Maintenant, Seigneur, tu peux laisser ton serviteur s'en aller en paix. Car mes yeux ont vu ton salut que tu as préparé à la face de tous les peuples.",
      },
      {
        title: "Le Recouvrement de Jésus au Temple",
        fruit: "La piété filiale et la fidélité à la vocation",
        scripture: 'Lc 2, 41-52',
        scriptureText: "Au bout de trois jours, ses parents le trouvèrent dans le Temple, assis au milieu des docteurs de la Loi, les écoutant et les interrogeant. Et sa mère lui dit : Mon enfant, pourquoi nous as-tu fait cela ?",
      },
    ],
  },
  {
    key: 'luminous',
    label: 'Mystères Lumineux',
    days: 'Jeudi',
    mysteries: [
      {
        title: 'Le Baptême de Jésus au Jourdain',
        fruit: "L'ouverture à l'Esprit Saint",
        scripture: 'Mt 3, 13-17',
        scriptureText: "Jésus fut baptisé et, à l'instant, il remonta de l'eau. Le ciel s'ouvrit et il vit l'Esprit de Dieu descendre comme une colombe et venir sur lui. Et une voix venant du ciel disait : Celui-ci est mon Fils bien-aimé, en qui j'ai mis toute ma faveur.",
      },
      {
        title: 'Les Noces de Cana',
        fruit: "La confiance en Marie et en la Parole du Christ",
        scripture: 'Jn 2, 1-11',
        scriptureText: "La mère de Jésus lui dit : Ils n'ont plus de vin. Sa mère dit aux serviteurs : Faites tout ce qu'il vous dira. Jésus leur dit : Remplissez les jarres d'eau. Tel fut le premier des signes miraculeux que Jésus accomplit.",
      },
      {
        title: "L'Annonce du Royaume de Dieu",
        fruit: "La conversion et la confiance en Dieu",
        scripture: 'Mc 1, 14-15',
        scriptureText: "Jésus se rendit en Galilée, proclamant la Bonne Nouvelle de Dieu : Les temps sont accomplis et le Règne de Dieu est tout proche. Repentez-vous et croyez à la Bonne Nouvelle.",
      },
      {
        title: 'La Transfiguration',
        fruit: "Le désir ardent de la sainteté",
        scripture: 'Mt 17, 1-8',
        scriptureText: "Jésus fut transfiguré devant eux ; son visage devint brillant comme le soleil et ses vêtements blancs comme la lumière. Une voix disait depuis la nuée : Celui-ci est mon Fils bien-aimé, en qui j'ai mis toute ma faveur. Écoutez-le.",
      },
      {
        title: "L'Institution de l'Eucharistie",
        fruit: "L'adoration et l'amour eucharistiques",
        scripture: 'Lc 22, 19-20',
        scriptureText: "Puis, prenant du pain et rendant grâce, il le rompit et le leur donna, en disant : Ceci est mon corps, donné pour vous. Faites cela en mémoire de moi. Il fit de même pour la coupe, après le repas.",
      },
    ],
  },
  {
    key: 'sorrowful',
    label: 'Mystères Douloureux',
    days: 'Mardi & Vendredi',
    mysteries: [
      {
        title: "L'Agonie à Gethsémani",
        fruit: "La contrition et le repentir de nos péchés",
        scripture: 'Lc 22, 39-46',
        scriptureText: "Dans son angoisse, Jésus priait avec plus d'insistance, et sa sueur devint comme des gouttes de sang tombant à terre. Il dit : Père, si tu veux, éloigne de moi cette coupe ; cependant, que ce soit ta volonté et non la mienne qui se réalise.",
      },
      {
        title: 'La Flagellation',
        fruit: "La mortification et la pénitence",
        scripture: 'Jn 19, 1',
        scriptureText: "Alors Pilate prit Jésus et le fit flageller. Ce n'est pas lui que je trouve coupable, dit-il. C'est pourquoi je vais le faire flageller, puis le relâcher.",
      },
      {
        title: "Le Couronnement d'épines",
        fruit: "Le courage moral et le mépris des humiliations",
        scripture: 'Jn 19, 2-3',
        scriptureText: "Les soldats tressèrent une couronne d'épines, la posèrent sur sa tête et le revêtirent d'un manteau de pourpre. Ils s'approchaient de lui et disaient : Salut, roi des Juifs ! Et ils lui donnaient des gifles.",
      },
      {
        title: 'Le Portement de la Croix',
        fruit: "La patience et la persévérance dans les épreuves",
        scripture: 'Lc 23, 26-32',
        scriptureText: "Comme ils l'emmenaient, ils prirent un certain Simon de Cyrène qui revenait des champs, et ils le chargèrent de la croix pour qu'il la porte derrière Jésus. Jésus dit : Si quelqu'un veut marcher derrière moi, qu'il renonce à lui-même.",
      },
      {
        title: 'La Crucifixion et la Mort de Jésus',
        fruit: "La grâce de la persévérance finale et la rémission des péchés",
        scripture: 'Jn 19, 25-30',
        scriptureText: "Près de la croix de Jésus se tenaient sa mère, la sœur de sa mère, Marie, femme de Clopas, et Marie de Magdala. Jésus dit à sa mère : Femme, voici ton fils. Puis au disciple : Voici ta mère. Puis, baissant la tête, il remit l'esprit.",
      },
    ],
  },
  {
    key: 'glorious',
    label: 'Mystères Glorieux',
    days: 'Mercredi & Dimanche',
    mysteries: [
      {
        title: 'La Résurrection de Jésus',
        fruit: "La foi vivante et la joie pascale",
        scripture: 'Jn 20, 1-18',
        scriptureText: "Le premier jour de la semaine, Marie de Magdala se rend au tombeau de grand matin. Elle vit que la pierre avait été enlevée du tombeau. Jésus lui dit : Ne me retiens pas, car je ne suis pas encore monté vers le Père.",
      },
      {
        title: "L'Ascension de Jésus",
        fruit: "L'espérance des biens célestes et le désir du ciel",
        scripture: 'Ac 1, 9-11',
        scriptureText: "Il fut emporté sous leurs yeux, et une nuée le déroba à leur regard. Deux hommes en vêtements blancs leur dirent : Hommes de Galilée, pourquoi restez-vous là à regarder vers le ciel ? Ce Jésus qui a été enlevé parmi vous vers le ciel viendra de la même manière.",
      },
      {
        title: 'La Pentecôte',
        fruit: "La charité ardente et les sept dons du Saint-Esprit",
        scripture: 'Ac 2, 1-4',
        scriptureText: "Quand arriva le jour de la Pentecôte, ils se trouvaient réunis tous ensemble. Ils virent apparaître des langues comme de feu qui se partageaient et il s'en posa une sur chacun d'eux. Ils furent tous remplis de l'Esprit Saint.",
      },
      {
        title: "L'Assomption de la Vierge Marie",
        fruit: "La piété filiale envers Marie, Mère de Dieu",
        scripture: 'Ap 12, 1',
        scriptureText: "Un signe grandiose apparut dans le ciel : une femme enveloppée du soleil, la lune sous ses pieds, et sur sa tête une couronne de douze étoiles.",
      },
      {
        title: 'Le Couronnement de Marie, Reine du Ciel',
        fruit: "La confiance et la dévotion à la Vierge Marie",
        scripture: 'Ap 12, 10',
        scriptureText: "J'entendis dans le ciel une voix forte qui disait : C'est maintenant le salut, la puissance et le règne de notre Dieu, et le pouvoir de son Christ. Car il a été précipité, l'accusateur de nos frères.",
      },
    ],
  },
];

// Determine today's mystery set by day of week
function getTodaySet(): MysterySet {
  const day = new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
  if (day === 1 || day === 6) return MYSTERY_SETS[0]; // Joyful
  if (day === 4) return MYSTERY_SETS[1];               // Luminous
  if (day === 2 || day === 5) return MYSTERY_SETS[2];  // Sorrowful
  return MYSTERY_SETS[3];                               // Glorious
}

// ── State machine types ─────────────────────────────────────────────────────
type Step =
  | 'chooser'
  | 'credo'
  | 'pater-intro'
  | 'ave-intro-1'
  | 'ave-intro-2'
  | 'ave-intro-3'
  | 'gloria-intro'
  | { mystery: number }
  | { pater: number }
  | { ave: number; index: number }
  | { gloria: number }
  | { fatima: number }
  | 'salve'
  | 'done';

function getStepLabel(step: Step): string {
  if (step === 'credo') return 'Je crois en Dieu';
  if (step === 'pater-intro') return 'Notre Père';
  if (step === 'ave-intro-1') return 'Je vous salue, Marie (1)';
  if (step === 'ave-intro-2') return 'Je vous salue, Marie (2)';
  if (step === 'ave-intro-3') return 'Je vous salue, Marie (3)';
  if (step === 'gloria-intro') return 'Gloire au Père';
  if (step === 'salve') return 'Salve Regina';
  if (typeof step === 'object' && 'mystery' in step) return `Mystère ${step.mystery + 1}`;
  if (typeof step === 'object' && 'pater' in step) return `Notre Père — Dizaine ${step.pater + 1}`;
  if (typeof step === 'object' && 'ave' in step) return `Je vous salue, Marie ${step.index + 1} / 10`;
  if (typeof step === 'object' && 'gloria' in step) return `Gloire au Père — Dizaine ${step.gloria + 1}`;
  if (typeof step === 'object' && 'fatima' in step) return `Ô mon Jésus — Dizaine ${step.fatima + 1}`;
  return '';
}

function getStepText(step: Step): string {
  if (step === 'credo') return JE_CROIS_EN_DIEU;
  if (step === 'pater-intro') return NOTRE_PERE;
  if (step === 'ave-intro-1' || step === 'ave-intro-2' || step === 'ave-intro-3') return JE_VOUS_SALUE;
  if (step === 'gloria-intro') return GLOIRE_AU_PERE;
  if (step === 'salve') return SALVE_REGINA;
  if (typeof step === 'object' && 'pater' in step) return NOTRE_PERE;
  if (typeof step === 'object' && 'ave' in step) return JE_VOUS_SALUE;
  if (typeof step === 'object' && 'gloria' in step) return GLOIRE_AU_PERE;
  if (typeof step === 'object' && 'fatima' in step) return O_MON_JESUS;
  return '';
}

function nextStep(step: Step, total = 5): Step {
  if (step === 'credo') return 'pater-intro';
  if (step === 'pater-intro') return 'ave-intro-1';
  if (step === 'ave-intro-1') return 'ave-intro-2';
  if (step === 'ave-intro-2') return 'ave-intro-3';
  if (step === 'ave-intro-3') return 'gloria-intro';
  if (step === 'gloria-intro') return { mystery: 0 };
  if (typeof step === 'object' && 'mystery' in step) return { pater: step.mystery };
  if (typeof step === 'object' && 'pater' in step) return { ave: step.pater, index: 0 };
  if (typeof step === 'object' && 'ave' in step) {
    if (step.index < 9) return { ave: step.ave, index: step.index + 1 };
    return { gloria: step.ave };
  }
  if (typeof step === 'object' && 'gloria' in step) return { fatima: step.gloria };
  if (typeof step === 'object' && 'fatima' in step) {
    const next = step.fatima + 1;
    return next < total ? { mystery: next } : 'salve';
  }
  if (step === 'salve') return 'done';
  return 'done';
}

function prevStep(step: Step): Step {
  if (step === 'credo') return 'chooser';
  if (step === 'pater-intro') return 'credo';
  if (step === 'ave-intro-1') return 'pater-intro';
  if (step === 'ave-intro-2') return 'ave-intro-1';
  if (step === 'ave-intro-3') return 'ave-intro-2';
  if (step === 'gloria-intro') return 'ave-intro-3';
  if (typeof step === 'object' && 'mystery' in step) {
    return step.mystery === 0 ? 'gloria-intro' : { fatima: step.mystery - 1 };
  }
  if (typeof step === 'object' && 'pater' in step) return { mystery: step.pater };
  if (typeof step === 'object' && 'ave' in step) {
    return step.index === 0 ? { pater: step.ave } : { ave: step.ave, index: step.index - 1 };
  }
  if (typeof step === 'object' && 'gloria' in step) return { ave: step.gloria, index: 9 };
  if (typeof step === 'object' && 'fatima' in step) return { gloria: step.fatima };
  if (step === 'salve') return { fatima: 4 };
  return 'chooser';
}

function totalSteps(total = 5): number {
  return 6 + total * 14 + 1;
}

function getAudioUrl(step: Step, setKey: string): string | null {
  if (step === 'credo') return '/audio/chapelet/credo.mp3';
  if (step === 'pater-intro') return '/audio/chapelet/notre-pere.mp3';
  if (step === 'ave-intro-1' || step === 'ave-intro-2' || step === 'ave-intro-3') return '/audio/chapelet/ave-maria.mp3';
  if (step === 'gloria-intro') return '/audio/chapelet/gloire.mp3';
  if (step === 'salve') return '/audio/chapelet/salve-regina.mp3';
  if (typeof step === 'object' && 'mystery' in step) return `/audio/chapelet/${setKey}-${step.mystery + 1}.mp3`;
  if (typeof step === 'object' && 'pater' in step) return '/audio/chapelet/notre-pere.mp3';
  if (typeof step === 'object' && 'ave' in step) return '/audio/chapelet/ave-maria.mp3';
  if (typeof step === 'object' && 'gloria' in step) return '/audio/chapelet/gloire.mp3';
  if (typeof step === 'object' && 'fatima' in step) return '/audio/chapelet/fatima.mp3';
  return null;
}

function stepIndex(step: Step, total = 5): number {
  if (step === 'chooser' || step === 'credo') return 0;
  if (step === 'pater-intro') return 1;
  if (step === 'ave-intro-1') return 2;
  if (step === 'ave-intro-2') return 3;
  if (step === 'ave-intro-3') return 4;
  if (step === 'gloria-intro') return 5;
  if (typeof step === 'object' && 'mystery' in step) return 6 + step.mystery * 14;
  if (typeof step === 'object' && 'pater' in step) return 7 + step.pater * 14;
  if (typeof step === 'object' && 'ave' in step) return 8 + step.ave * 14 + step.index;
  if (typeof step === 'object' && 'gloria' in step) return 18 + step.gloria * 14;
  if (typeof step === 'object' && 'fatima' in step) return 19 + step.fatima * 14;
  if (step === 'salve') return 6 + total * 14;
  if (step === 'done') return totalSteps(total);
  return 0;
}

// ── Component ──────────────────────────────────────────────────────────────

const Chapelet = () => {
  const { t } = useTranslation();
  const { play, stop, playing } = useAudio();

  const [mysterySet, setMysterySet] = useState<MysterySet>(() => {
    try {
      const saved = localStorage.getItem('chapelet-state');
      if (saved) {
        const { setKey } = JSON.parse(saved);
        const found = MYSTERY_SETS.find((s) => s.key === setKey);
        if (found) return found;
      }
    } catch {}
    return getTodaySet();
  });

  const [step, setStep] = useState<Step>(() => {
    try {
      const saved = localStorage.getItem('chapelet-state');
      if (saved) {
        const { step: s } = JSON.parse(saved);
        if (s && s !== 'done' && s !== 'chooser') return s as Step;
      }
    } catch {}
    return 'chooser';
  });

  const [autoRead, setAutoRead] = useState<boolean>(() => {
    try { return localStorage.getItem('chapelet-autoread') === 'true'; } catch { return false; }
  });

  // Persist progress so user can resume after navigating away
  useEffect(() => {
    if (step === 'chooser' || step === 'done') {
      try { localStorage.removeItem('chapelet-state'); } catch {}
      return;
    }
    try {
      localStorage.setItem('chapelet-state', JSON.stringify({ setKey: mysterySet.key, step }));
    } catch {}
  }, [step, mysterySet.key]);

  const mysteries = mysterySet.mysteries;
  const total = mysteries.length;

  const isMystery = typeof step === 'object' && 'mystery' in step;
  const currentMystery = isMystery ? mysteries[(step as { mystery: number }).mystery] : null;

  const handleNext = useCallback(() => {
    stop();
    setStep((s) => nextStep(s, total));
  }, [stop, total]);

  const handlePrev = useCallback(() => {
    stop();
    setStep((s) => prevStep(s));
  }, [stop]);

  const handleListen = () => {
    if (playing) { stop(); return; }
    const url = getAudioUrl(step, mysterySet.key);
    if (url) play(url);
  };

  useEffect(() => {
    if (!autoRead || step === 'chooser' || step === 'done') return;
    const url = getAudioUrl(step, mysterySet.key);
    if (!url) return;
    const id = setTimeout(() => play(url), 400);
    return () => clearTimeout(id);
  }, [step, autoRead, mysterySet.key]);

  const toggleAutoRead = () => {
    const next = !autoRead;
    setAutoRead(next);
    try { localStorage.setItem('chapelet-autoread', String(next)); } catch {}
    if (!next) stop();
  };

  const restart = () => {
    stop();
    try { localStorage.removeItem('chapelet-state'); } catch {}
    setStep('chooser');
  };

  const idx = stepIndex(step, total);
  const tot = totalSteps(total);
  const pct = tot > 0 ? Math.round((idx / tot) * 100) : 0;

  const text = getStepText(step);
  const label = getStepLabel(step);

  // ── Chooser ──────────────────────────────────────────────────────────────
  if (step === 'chooser') {
    return (
      <div className="min-h-screen bg-background">
        <Helmet><title>Le Saint Rosaire — Voie Vérité Vie</title></Helmet>
        <Navigation />
        <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 text-center px-4">
          <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
          <div className="relative max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
              <BookOpen className="h-3.5 w-3.5 text-cathedral-gold" />
              <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">{t('chapelet.badge')}</span>
            </div>
            <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-4">{t('chapelet.title')}</h1>
            <div className="cathedral-line w-24 h-px mx-auto my-4" />
            <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">{t('chapelet.subtitle')}</p>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-10 space-y-4">
          {(() => {
            try {
              const saved = localStorage.getItem('chapelet-state');
              if (saved) {
                const { setKey } = JSON.parse(saved);
                const found = MYSTERY_SETS.find((s) => s.key === setKey);
                if (found) return (
                  <div className="rounded-xl border border-cathedral-gold/40 bg-cathedral-gold/10 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t('chapelet.resumeTitle')}</p>
                      <p className="text-xs text-muted-foreground">{found.label}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold rounded-lg shrink-0"
                      onClick={() => { setMysterySet(found); setStep(JSON.parse(saved).step); }}
                    >
                      {t('chapelet.resume')}
                    </Button>
                  </div>
                );
              }
            } catch {}
            return null;
          })()}
          <h2 className="font-cinzel font-bold text-foreground text-base">{t('chapelet.chooseSet')}</h2>
          {MYSTERY_SETS.map((ms) => (
            <button
              key={ms.key}
              onClick={() => { setMysterySet(ms); setStep('credo'); }}
              className={`w-full flex items-center justify-between rounded-2xl border p-5 text-left transition-all hover:shadow-md ${ms.key === mysterySet.key ? 'border-cathedral-gold/60 bg-cathedral-gold/10' : 'border-border/60 bg-card hover:border-cathedral-gold/30'}`}
            >
              <div>
                <div className="font-cinzel font-bold text-foreground">{ms.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{ms.days}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </main>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background">
        <Helmet><title>Le Saint Rosaire — Voie Vérité Vie</title></Helmet>
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="max-w-sm text-center space-y-5">
            <div className="text-6xl">🌹</div>
            <h2 className="font-cinzel text-2xl font-bold text-foreground">{t('chapelet.done')}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{t('chapelet.doneDesc')}</p>
            <div className="rounded-xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-4">
              <p className="font-['Playfair_Display',serif] text-sm italic text-foreground/80">{t('chapelet.doneVerse')}</p>
            </div>
            <Button onClick={restart} className="rounded-xl w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold">
              <RotateCcw className="h-4 w-4 mr-2" /> {t('chapelet.newChapelet')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Prayer step ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Le Saint Rosaire — Voie Vérité Vie</title></Helmet>
      <Navigation />

      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-8 text-center px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <p className="font-cinzel text-cathedral-gold text-sm font-bold tracking-wider mb-1">{mysterySet.label}</p>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white">{t('chapelet.title')}</h1>
          <div className="mt-4 w-full bg-white/20 rounded-full h-1.5">
            <div
              className="bg-cathedral-gold h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-white/60 text-xs mt-1">{pct}%</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">

        {currentMystery && (
          <div className="rounded-2xl border border-cathedral-gold/30 bg-cathedral-gold/5 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="rounded-full text-cathedral-gold border-cathedral-gold/40 text-xs">
                {t('chapelet.mysteryOf', { n: (step as { mystery: number }).mystery + 1 })}
              </Badge>
              <button
                onClick={handleListen}
                title={playing ? t('chapelet.stop') : t('chapelet.listen')}
                className={`p-2 rounded-full transition-colors ${playing ? 'text-cathedral-gold bg-cathedral-gold/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                {playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
            <h2 className="font-cinzel font-bold text-foreground text-lg">{currentMystery.title}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('chapelet.fruit')}</p>
                <p className="text-foreground font-medium text-xs">{currentMystery.fruit}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('chapelet.scripture')}</p>
                <p className="text-cathedral-gold font-bold text-xs">{currentMystery.scripture}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-cathedral-gold/30 pl-3">
              {currentMystery.scriptureText}
            </p>
          </div>
        )}

        {text && (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cinzel font-bold text-foreground text-base">{label}</h3>
              <button
                  onClick={handleListen}
                  title={playing ? t('chapelet.stop') : t('chapelet.listen')}
                  className={`p-2 rounded-full transition-colors ${playing ? 'text-cathedral-gold bg-cathedral-gold/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
                  {playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
            </div>
            <p className="text-foreground text-sm leading-loose whitespace-pre-line font-['Playfair_Display',serif]">
              {text}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrev} className="flex-1 rounded-xl gap-1.5">
            <ChevronLeft className="h-4 w-4" /> {t('chapelet.previous')}
          </Button>
          <Button onClick={handleNext} className="flex-1 bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold rounded-xl gap-1.5">
            {t('chapelet.next')} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <button
            onClick={toggleAutoRead}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-all ${autoRead ? 'border-cathedral-gold/40 text-cathedral-gold bg-cathedral-gold/10' : 'border-border hover:border-border/80'}`}
          >
            {autoRead ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {t('chapelet.autoRead')}
          </button>
          <button onClick={restart} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <RotateCcw className="h-3 w-3" /> {t('chapelet.restart')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Chapelet;
