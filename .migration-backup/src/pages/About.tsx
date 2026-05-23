import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Cross, Heart, Book, Target, Lightbulb } from 'lucide-react';
import stainedGlass from '@/assets/stained-glass-cross.jpg';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const About = memo(() => {
  const { t } = useTranslation();

  const timeline = [
    { year: '2024', event: t('about.timeline2024a'), description: t('about.timeline2024aDesc') },
    { year: '2024', event: t('about.timeline2024b'), description: t('about.timeline2024bDesc') },
    { year: '2024', event: t('about.timeline2024c'), description: t('about.timeline2024cDesc') },
    { year: '2025', event: t('about.timeline2025a'), description: t('about.timeline2025aDesc') },
    { year: '2025', event: t('about.timeline2025b'), description: t('about.timeline2025bDesc') },
    { year: '2025', event: t('about.timeline2025c'), description: t('about.timeline2025cDesc') },
    { year: '2026', event: t('about.timeline2026a'), description: t('about.timeline2026aDesc') },
    { year: '2026', event: t('about.timeline2026b'), description: t('about.timeline2026bDesc') },
  ];

  const values = [
    { icon: Cross, title: t('mission.way'), verse: 'Jean 14:6', description: t('mission.wayDescription') },
    { icon: Book, title: t('mission.truth'), verse: 'Jean 8:32', description: t('mission.truthDescription') },
    { icon: Heart, title: t('mission.life'), verse: 'Jean 10:10', description: t('mission.lifeDescription') },
  ];

  const offers = [
    { titleKey: 'about.offerReadings', descKey: 'about.offerReadingsDesc' },
    { titleKey: 'about.offerLent', descKey: 'about.offerLentDesc' },
    { titleKey: 'about.offerStations', descKey: 'about.offerStationsDesc' },
    { titleKey: 'about.offerCommunity', descKey: 'about.offerCommunityDesc' },
    { titleKey: 'about.offerPrayer', descKey: 'about.offerPrayerDesc' },
    { titleKey: 'about.offerResources', descKey: 'about.offerResourcesDesc' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        {/* Hero */}
        <section className="relative h-[50vh] min-h-[320px] flex items-end overflow-hidden">
          <img src={stainedGlass} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          {/* Floating orbs */}
          <motion.div className="absolute top-20 right-[20%] w-40 h-40 rounded-full bg-cathedral-gold/10 blur-3xl" animate={{ y: [-15, 15, -15], scale: [1, 1.2, 1] }} transition={{ duration: 7, repeat: Infinity }} />
          <motion.div className="absolute bottom-40 left-[10%] w-32 h-32 rounded-full bg-stained-blue/10 blur-3xl" animate={{ y: [10, -20, 10] }} transition={{ duration: 9, repeat: Infinity }} />
          <div className="relative container mx-auto px-4 pb-10">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.7 }}>
              <p className="text-xs tracking-[0.4em] uppercase text-cathedral-gold/80 mb-3 font-inter">{t('about.ourMission')}</p>
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-gradient-gold mb-3">{t('about.title')}</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">{t('about.subtitle')}</p>
            </motion.div>
          </div>
        </section>

        {/* Mission text - flat, no box */}
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="cathedral-line w-16 mb-8" />
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm md:text-base font-inter">{t('about.missionP1')}</p>
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm md:text-base font-inter">{t('about.missionP2')}</p>
            <p className="text-muted-foreground leading-relaxed mb-6 text-sm md:text-base font-inter">{t('about.missionP3')}</p>
            <blockquote className="border-l-2 border-cathedral-gold/50 pl-6 py-2 my-8">
              <p className="text-lg italic font-playfair text-foreground/80">{t('about.mainVerse')}</p>
              <cite className="block mt-2 text-cathedral-gold text-sm font-inter not-italic">— Jean 14:6</cite>
            </blockquote>
          </div>
        </section>

        <div className="cathedral-line w-full" />

        {/* 3 Pillars */}
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-3xl font-cinzel font-bold text-foreground text-center mb-10">
              {t('about.whyTitle')}
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-10">
              {values.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.15 }} className="text-center group">
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-cathedral-gold/10 border border-cathedral-gold/30 flex items-center justify-center mx-auto mb-4"
                      whileHover={{ scale: 1.15, rotate: 5, boxShadow: '0 0 30px hsl(43 65% 52% / 0.3)' }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Icon className="w-7 h-7 text-cathedral-gold" />
                    </motion.div>
                    <h3 className="text-xl font-cinzel font-bold text-foreground mb-1 group-hover:text-gradient-gold transition-all">{v.title}</h3>
                    <p className="text-xs text-cathedral-gold/70 font-inter mb-3">{v.verse}</p>
                    <p className="text-sm text-muted-foreground font-inter leading-relaxed">{v.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="cathedral-line w-full" />

        {/* Objectives */}
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-cinzel font-bold text-foreground text-center mb-8">{t('about.objectives')}</h2>
            <div className="space-y-4">
              {[1,2,3,4,5,6].map((i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.08 }} className="flex items-start gap-4">
                  <Target className="w-4 h-4 text-cathedral-gold mt-1 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground font-inter leading-relaxed">{t(`about.obj${i}`)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="cathedral-line w-full" />

        {/* What We Offer */}
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-cinzel font-bold text-foreground text-center mb-10 flex items-center justify-center gap-3">
              <Lightbulb className="w-7 h-7 text-cathedral-gold" />
              {t('about.whatWeOffer')}
            </h2>
            <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
              {offers.map((item, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.08 }} className="border-b border-border/40 pb-4">
                  <h3 className="text-base font-cinzel font-semibold text-foreground mb-1">{t(item.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground font-inter">{t(item.descKey)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="cathedral-line w-full" />

        {/* Timeline */}
        <section className="py-10 pb-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-cinzel font-bold text-foreground text-center mb-10">{t('about.ourJourney')}</h2>
            <div className="relative pl-8">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-cathedral-gold/60 via-cathedral-gold/30 to-transparent" />
              {timeline.map((item, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.15 }} className="relative mb-8 last:mb-0">
                  <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-cathedral-gold shadow-[0_0_8px_hsl(var(--cathedral-gold)/0.5)]" />
                  <span className="text-xs font-inter text-cathedral-gold/70 tracking-wider">{item.year}</span>
                  <h3 className="text-base font-cinzel font-semibold text-foreground mt-1 mb-1">{item.event}</h3>
                  <p className="text-sm text-muted-foreground font-inter">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
});

About.displayName = 'About';
export default About;
