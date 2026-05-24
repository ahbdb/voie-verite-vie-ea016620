import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Sunset, Moon, Star, ChevronDown, ChevronUp, Copy, Check, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useSpeech } from '@/hooks/useSpeech';

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
      text: `Ô Jésus, par le Cœur Immaculé de Marie, je vous offre les prières, les travaux, les joies et les souffrances de cette journée, en réparation des péchés, pour les intentions de tous ceux qui prient avec moi, et en union avec le saint Sacrifice de la Messe.`,
      source: 'Prière traditionnelle',
    },
    {
      id: 'angeGardien',
      title: "Prière à l'Ange gardien",
      text: `Ange de Dieu, qui es mon gardien, éclaire, garde, conduis et gouverne celui que la bonté divine m'a confié. Amen.`,
      source: 'Prière traditionnelle',
    },
    {
      id: 'magnificat',
      title: 'Magnificat',
      subtitle: 'Cantique de la Vierge Marie',
      text: `Mon âme exalte le Seigneur, exulte mon esprit en Dieu, mon Sauveur !\nIl s'est penché sur son humble servante ; désormais tous les âges me diront bienheureuse.\nLe Tout-Puissant fit pour moi des merveilles ; Saint est son nom !\nSon amour s'étend d'âge en âge sur ceux qui le craignent.\nDéployant la force de son bras, il disperse les superbes.\nIl renverse les puissants de leurs trônes, il élève les humbles.\nIl comble de biens les affamés, renvoie les riches les mains vides.\nIl relève Israël son serviteur, il se souvient de son amour,\nde la promesse faite à nos pères, en faveur d'Abraham et de sa race à jamais.`,
      source: 'Luc 1, 46-55',
    },
    {
      id: 'psaume63',
      title: 'Psaume 63 — Prière de l\'aurore',
      text: `Ô Dieu, tu es mon Dieu, je te cherche dès l'aube ;\nmon âme a soif de toi ;\nma chair languit après toi dans une terre aride, altérée, sans eau.\nC'est ainsi que je t'ai contemplé dans le sanctuaire,\nvoyant ta puissance et ta gloire.\nTon amour vaut mieux que la vie,\nmes lèvres diront ta louange.\nAinsi je te bénirai ma vie durant,\nen ton nom j'élèverai les mains.`,
      source: 'Psaume 63, 2-5',
    },
  ],
  midi: [
    {
      id: 'angelus',
      title: 'Angélus',
      subtitle: 'À midi, la prière de l\'Incarnation',
      text: `L'Ange du Seigneur a annoncé à Marie, et elle a conçu du Saint-Esprit.\n\nJe vous salue, Marie, pleine de grâce ; le Seigneur est avec vous. Vous êtes bénie entre toutes les femmes et Jésus, le fruit de vos entrailles, est béni. Sainte Marie, Mère de Dieu, priez pour nous, pauvres pécheurs, maintenant et à l'heure de notre mort. Amen.\n\nJe suis la servante du Seigneur, qu'il me soit fait selon votre parole.\n\nJe vous salue, Marie...\n\nEt le Verbe s'est fait chair, et il a habité parmi nous.\n\nJe vous salue, Marie...\n\nPriez pour nous, sainte Mère de Dieu. Afin que nous soyons rendus dignes des promesses de Jésus-Christ.\n\nPrions : Répandez, Seigneur, votre grâce en nos âmes, afin que nous qui avons connu, par le message de l'ange, l'Incarnation de votre Fils Jésus-Christ, nous soyons conduits par sa passion et sa croix jusqu'à la gloire de la résurrection. Par le même Jésus-Christ, Notre Seigneur. Amen.`,
      source: 'Prière mariale',
    },
    {
      id: 'pause',
      title: 'Prière de la pause',
      subtitle: 'Pour sanctifier le milieu du jour',
      text: `Seigneur, je m'arrête un instant pour me rappeler votre présence.\nDans l'agitation de cette journée, rappelez-moi que je suis en votre main.\nBénissez mes actions, mes rencontres et mes paroles.\nFaites que tout ce que j'entreprends soit ordonné à votre gloire.\nJe vous confie l'après-midi qui vient. Amen.`,
    },
  ],
  soir: [
    {
      id: 'exammen',
      title: 'Examen de conscience',
      subtitle: 'Relire sa journée avec Dieu',
      text: `1. Reconnaissance — Seigneur, merci pour les grâces et les joies d'aujourd'hui.\n\n2. Demander la lumière — Esprit-Saint, éclaire mon regard pour voir ma journée comme tu la vois.\n\n3. Relire la journée — Qu'ai-je fait de bon ? Qu'est-ce qui aurait pu être mieux ? Y a-t-il eu des moments où j'ai blessé quelqu'un ou refusé votre appel ?\n\n4. Exprimer le regret — Seigneur, je suis désolé pour mes manquements. Pardonnez-moi.\n\n5. Tourner vers demain — Avec votre aide, demain je veux... Bonne nuit, Seigneur.`,
    },
    {
      id: 'contrition',
      title: 'Acte de contrition',
      text: `Mon Dieu, j'ai un regret sincère de vous avoir offensé, parce que vous êtes infiniment bon, infiniment aimable et que le péché vous déplaît.\nJe prends la ferme résolution, avec le secours de votre sainte grâce, de ne plus vous offenser et de faire pénitence. Amen.`,
    },
    {
      id: 'complie',
      title: 'Prière du soir',
      text: `Avant que cette journée s'achève, Seigneur, je vous remets tout ce que j'ai vécu :\nles réussites et les échecs, les joies et les peines, les efforts et les repos.\nVeillez sur moi et sur ceux que j'aime cette nuit.\nDonnez-moi le repos du corps et la paix de l'âme.\nQue vos anges m'entourent de leur protection.\nJe remets mon esprit entre vos mains. Amen.`,
    },
    {
      id: 'nunc',
      title: 'Cantique de Syméon (Nunc Dimittis)',
      text: `Maintenant, ô Maître, tu peux laisser ton serviteur s'en aller en paix selon ta parole ;\ncar mes yeux ont vu ton salut,\nque tu as préparé devant tous les peuples,\nlumière pour éclairer les nations,\net gloire de ton peuple Israël.`,
      source: 'Luc 2, 29-32',
    },
  ],
  nuit: [
    {
      id: 'abandon',
      title: "Acte d'abandon",
      subtitle: 'Se remettre totalement à Dieu',
      text: `Père, je m'abandonne à toi ; fais de moi ce qu'il te plaira.\nQuoi que tu fasses de moi, je te remercie.\nJe suis prêt à tout, j'accepte tout.\nPourvu que ta volonté se fasse en moi et en toutes tes créatures,\nje ne désire rien d'autre, mon Dieu.\nJe remets mon âme entre tes mains.\nJe te la donne, mon Dieu, avec tout l'amour de mon cœur,\nparce que je t'aime,\net que c'est pour moi un besoin d'amour de me donner, de me remettre entre tes mains sans mesure,\navec une infinie confiance, car tu es mon Père. Amen.`,
      source: 'Charles de Foucauld',
    },
    {
      id: 'souvenez',
      title: 'Memorare',
      text: `Souvenez-vous, ô très miséricordieuse Vierge Marie, qu'on n'a jamais entendu dire que personne de ceux qui ont eu recours à votre protection, imploré votre secours ou demandé votre intercession ait été abandonné.\nAnimé d'une telle confiance, je viens à vous, ô Vierge des vierges, ma Mère !\nJe viens vers vous et, gémissant sous le poids de mes péchés, je tombe à vos pieds.\nVierge Mère du Verbe, ne méprisez pas mes supplications ;\nécoutez-les favorablement et daignez les exaucer. Amen.`,
      source: 'Saint Bernard',
    },
  ],
};

const TIME_CONFIG: Record<TimeOfDay, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgClass: string;
  borderClass: string;
}> = {
  matin: { label: 'Prières du Matin', icon: <Sun className="h-5 w-5" />,    color: 'text-amber-500',  bgClass: 'bg-amber-500/10',  borderClass: 'border-amber-500/30' },
  midi:  { label: 'Prières de Midi',  icon: <Sunset className="h-5 w-5" />, color: 'text-orange-500', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30' },
  soir:  { label: 'Prières du Soir',  icon: <Moon className="h-5 w-5" />,   color: 'text-blue-500',   bgClass: 'bg-blue-500/10',   borderClass: 'border-blue-500/30' },
  nuit:  { label: 'Prières de Nuit',  icon: <Star className="h-5 w-5" />,   color: 'text-violet-500', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/30' },
};

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'matin';
  if (h >= 12 && h < 17) return 'midi';
  if (h >= 17 && h < 22) return 'soir';
  return 'nuit';
};

const PriereQuotidienne = () => {
  const suggested = useMemo(getTimeOfDay, []);
  const [activeTime, setActiveTime] = useState<TimeOfDay>(suggested);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const { speak, stop, speaking, supported } = useSpeech(0.82);

  const config = TIME_CONFIG[activeTime];
  const prayers = PRAYERS[activeTime];

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      // Stop any running speech when collapsing
      if (playingId && playingId !== id) {
        stop();
        setPlayingId(null);
      }
    }
  };

  const handlePlay = (p: PrayerBlock) => {
    if (playingId === p.id && speaking) {
      stop();
      setPlayingId(null);
    } else {
      setPlayingId(p.id);
      speak(p.text.replace(/\n/g, ' '));
      // Track when speech ends
      const check = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setPlayingId(null);
          clearInterval(check);
        }
      }, 500);
    }
  };

  const copyPrayer = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Prière copiée !');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Prière du Jour — Voie Vérité Vie</title>
        <meta name="description" content="Priez matin, midi, soir et nuit avec des prières traditionnelles catholiques adaptées à chaque moment." />
      </Helmet>
      <Navigation />

      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 text-center px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <span className="text-cathedral-gold text-sm">🕯️</span>
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">Liturgie des Heures</span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-4">Prière du Jour</h1>
          <div className="cathedral-line w-24 h-px mx-auto my-4" />
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Sanctifiez chaque moment de votre journée par la prière. Matin, midi, soir et nuit — laissez Dieu habiter votre temps.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Time selector */}
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(TIME_CONFIG) as TimeOfDay[]).map((key) => {
            const c = TIME_CONFIG[key];
            const isActive = activeTime === key;
            const isSuggested = key === suggested;
            return (
              <button
                key={key}
                onClick={() => { setActiveTime(key); setExpanded(null); stop(); setPlayingId(null); }}
                className={`relative rounded-xl border p-3 text-center transition-all ${isActive ? `${c.bgClass} ${c.borderClass}` : 'border-border/60 hover:border-border bg-card'}`}
              >
                {isSuggested && (
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-cathedral-gold border-2 border-background" />
                )}
                <div className={`flex justify-center mb-1 ${isActive ? c.color : 'text-muted-foreground'}`}>{c.icon}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? c.color : 'text-muted-foreground'}`}>{key}</div>
              </button>
            );
          })}
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${config.bgClass} w-fit`}>
          <span className={config.color}>{config.icon}</span>
          <span className={`text-sm font-cinzel font-bold ${config.color}`}>{config.label}</span>
        </div>

        {/* Prayer accordion */}
        <div className="space-y-3">
          {prayers.map((p) => {
            const isOpen = expanded === p.id;
            const isPlaying = playingId === p.id && speaking;
            return (
              <div key={p.id} className={`rounded-2xl border transition-all ${isOpen ? `${config.borderClass} bg-card` : 'border-border/60 bg-card hover:border-border/80'}`}>
                <button onClick={() => toggleExpand(p.id)} className="w-full flex items-center justify-between p-5 text-left">
                  <div>
                    <div className="font-cinzel font-bold text-foreground">{p.title}</div>
                    {p.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{p.subtitle}</div>}
                  </div>
                  {isOpen
                    ? <ChevronUp className={`h-4 w-4 ${config.color} shrink-0`} />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-4">
                    <div className="relative rounded-xl bg-muted/40 p-5">
                      <span className="absolute top-2 left-3 text-3xl font-serif text-cathedral-gold/20 leading-none select-none">"</span>
                      <p className="font-['Playfair_Display',serif] text-sm text-foreground/90 leading-relaxed whitespace-pre-line italic relative z-10">
                        {p.text}
                      </p>
                    </div>

                    {/* Voice animation */}
                    {isPlaying && (
                      <div className="flex items-center gap-2 text-xs text-cathedral-gold">
                        <span className="flex gap-0.5">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className="w-1 rounded-full bg-cathedral-gold animate-bounce" style={{ height: '10px', animationDelay: `${i * 0.12}s` }} />
                          ))}
                        </span>
                        Lecture en cours...
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      {p.source ? (
                        <Badge variant="outline" className="text-xs rounded-full text-muted-foreground border-border">{p.source}</Badge>
                      ) : <div />}

                      <div className="flex items-center gap-2">
                        {/* Listen button */}
                        {supported && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-1.5 text-xs ${isPlaying ? 'text-cathedral-gold' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handlePlay(p)}
                          >
                            {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {isPlaying ? 'Arrêter' : 'Écouter'}
                          </Button>
                        )}
                        {/* Copy button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => copyPrayer(p.text, p.id)}
                        >
                          {copied === p.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          Copier
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-5 text-center">
          <p className="text-sm text-muted-foreground italic">« Priez sans cesse. »</p>
          <p className="text-xs text-cathedral-gold font-semibold mt-1">1 Thessaloniciens 5, 17</p>
        </div>
      </main>
    </div>
  );
};

export default PriereQuotidienne;
