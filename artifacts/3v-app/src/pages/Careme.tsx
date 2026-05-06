import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Flame, ChevronRight, Lock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import stainedGlass from '@/assets/stained-glass-cross.jpg';

interface CaremeYear {
  year: number;
  href: string | null;
  status: 'active' | 'soon';
  description: string;
}

const years: CaremeYear[] = [
  {
    year: 2026,
    href: '/careme-2026',
    status: 'active',
    description: '40 jours de prière, pénitence et partage — du 18 février au 4 avril 2026.',
  },
  {
    year: 2027,
    href: null,
    status: 'soon',
    description: 'Le programme du Carême 2027 sera publié dès l’ouverture du temps liturgique.',
  },
];

const Careme = memo(() => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Carême — Voie Vérité Vie</title>
        <meta name="description" content="Programme du Carême : éditions 2026 et 2027." />
      </Helmet>
      <Navigation />

      <header className="relative h-[34vh] min-h-[240px] flex items-end overflow-hidden">
        <img src={stainedGlass} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <motion.div
          className="relative z-10 container mx-auto px-4 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Flame className="w-7 h-7 text-cathedral-gold mb-2" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-cinzel font-bold text-foreground mb-1">
            Carême
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Choisis l’édition que tu souhaites vivre avec la communauté 3V.
          </p>
        </motion.div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-10 max-w-3xl">
        <div className="divide-y divide-border">
          {years.map((y, idx) => {
            const isActive = y.status === 'active' && y.href;
            const inner = (
              <div className="flex items-center gap-4 py-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-cinzel font-bold text-foreground">
                      Carême {y.year}
                    </h2>
                    {y.status === 'soon' && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Bientôt
                      </span>
                    )}
                    {y.status === 'active' && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        En cours
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{y.description}</p>
                </div>
                {isActive && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
                )}
              </div>
            );
            if (isActive) {
              return (
                <motion.div
                  key={y.year}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    to={y.href as string}
                    className="block hover:bg-muted/30 transition-colors -mx-2 px-2 rounded-lg"
                  >
                    {inner}
                  </Link>
                </motion.div>
              );
            }
            return (
              <motion.div
                key={y.year}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="opacity-60 cursor-not-allowed"
                aria-disabled="true"
              >
                {inner}
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground/70 text-center mt-8">
          {t('careme.title')} — Mouvement Voie · Vérité · Vie
        </p>
      </main>
    </div>
  );
});

Careme.displayName = 'Careme';
export default Careme;