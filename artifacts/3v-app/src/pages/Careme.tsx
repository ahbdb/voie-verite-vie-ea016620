import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Flame, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import stainedGlass from '@/assets/stained-glass-cross.jpg';

interface CaremeEntry {
  year: number;
  route: string;
  status: 'active' | 'coming_soon';
  dateRange: string;
  description: string;
}

const CAREMES: CaremeEntry[] = [
  {
    year: 2026,
    route: '/careme-2026',
    status: 'active',
    dateRange: '18 fév — 4 avr 2026',
    description: '40 jours de prière, de pénitence et de partage. Programme complet avec actions quotidiennes pour soi, le prochain et Dieu.',
  },
  {
    year: 2027,
    route: '#',
    status: 'coming_soon',
    dateRange: '10 fév — 27 mars 2027',
    description: 'Le programme du Carême 2027 sera disponible prochainement. Restez attentifs !',
  },
];

const Careme = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <header className="relative h-[35vh] min-h-[240px] flex items-end overflow-hidden">
        <img src={stainedGlass} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <motion.div
          className="relative z-10 container mx-auto px-4 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Flame className="w-7 h-7 text-cathedral-gold mb-2" />
          <h1 className="text-3xl sm:text-4xl font-cinzel font-bold text-foreground mb-1">
            {t('careme.hubTitle', 'Carême — Voie Vérité Vie')}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            {t('careme.hubSubtitle', '40 jours de conversion, année après année. Choisissez votre programme.')}
          </p>
        </motion.div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-4">
          {CAREMES.map((c, idx) => {
            const isComingSoon = c.status === 'coming_soon';
            return (
              <motion.div
                key={c.year}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <button
                  className={`w-full text-left p-5 rounded-xl border transition-all group ${
                    isComingSoon
                      ? 'border-border bg-muted/20 opacity-60 cursor-default'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer'
                  }`}
                  disabled={isComingSoon}
                  onClick={() => !isComingSoon && navigate(c.route)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-cinzel font-bold text-lg text-foreground">
                          Carême {c.year}
                        </span>
                        {isComingSoon ? (
                          <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Bientôt
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">
                            Programme disponible
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-primary/70 font-medium mb-2">{c.dateRange}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                    </div>
                    {!isComingSoon && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 italic">
          « L'homme ne vit pas de pain seulement. » (Mt 4,4)
        </p>
      </main>
    </div>
  );
};

export default Careme;
