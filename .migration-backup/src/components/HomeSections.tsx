import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Calendar, Heart, MessageCircle, Youtube } from 'lucide-react';
import activityBible from '@/assets/activity-bible-study.jpg';
import activityCommunity from '@/assets/activity-community.jpg';
import activityConference from '@/assets/activity-conference.jpg';
import activityCreative from '@/assets/activity-creative.jpg';
import activityMeditation from '@/assets/activity-meditation.jpg';
import ctaMary from '@/assets/cta-mary.jpg';
import { useRef } from 'react';

const ActivitiesSection = () => {
  const { t } = useTranslation();

  const activities = [
    { title: t('homeActivities.biblicalReading'), desc: t('homeActivities.biblicalReadingDesc'), image: activityBible, link: '/biblical-reading', icon: BookOpen },
    { title: t('homeActivities.communityTitle'), desc: t('homeActivities.communityDesc'), image: activityCommunity, link: '/prayer-forum', icon: Heart },
    { title: t('homeActivities.conferences'), desc: t('homeActivities.conferencesDesc'), image: activityConference, link: '/activities', icon: Calendar },
    { title: t('homeActivities.novenasTitle'), desc: t('homeActivities.novenasDesc'), image: activityCreative, link: '/neuvaines', icon: Heart },
    { title: t('homeActivities.meditation'), desc: t('homeActivities.meditationDesc'), image: activityMeditation, link: '/careme-2026', icon: BookOpen },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          className="flex items-end justify-between mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground mb-2 font-inter">{t('homeActivities.discover')}</p>
            <h2 className="text-3xl md:text-4xl font-cinzel font-bold text-foreground">{t('homeActivities.ourActivities')}</h2>
          </div>
          <Button variant="ghost" asChild className="gap-1 hidden sm:flex text-cathedral-gold hover:text-cathedral-gold/80">
            <Link to="/activities">{t('common.seeAll')} <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </motion.div>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-4 px-4 snap-x snap-mandatory scrollbar-hide">
        <div className="min-w-[max(0px,calc((100vw-1400px)/2+2rem-1rem))] shrink-0 hidden md:block" />
        {activities.map((activity, index) => (
          <motion.div
            key={activity.title}
            className="min-w-[260px] sm:min-w-[300px] snap-center shrink-0"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link to={activity.link}>
              <motion.div
                className="group relative rounded-2xl overflow-hidden h-[340px] shadow-subtle"
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <motion.img
                  src={activity.image}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.06 }}
                  transition={{ duration: 0.5 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,55%,5%,0.85)] via-[hsl(220,55%,5%,0.2)] to-transparent" />
                
                {/* Gold accent on hover */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cathedral-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <activity.icon className="w-4 h-4 text-cathedral-gold" />
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-inter">{activity.desc}</p>
                  </div>
                  <h3 className="text-xl font-playfair font-semibold text-white">{activity.title}</h3>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
        <div className="min-w-[max(0px,calc((100vw-1400px)/2+2rem-1rem))] shrink-0 hidden md:block" />
      </div>

      <div className="container mx-auto px-4 mt-6 sm:hidden">
        <Button variant="outline" asChild className="w-full gap-2 rounded-full">
          <Link to="/activities">{t('homeActivities.seeAllActivities')} <ArrowRight className="w-4 h-4" /></Link>
        </Button>
      </div>
    </section>
  );
};

const CTASection = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 0.5], [1.1, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.8]);

  return (
    <section ref={ref} className="relative h-[60vh] min-h-[440px] flex items-center justify-center overflow-hidden">
      <motion.div className="absolute inset-0" style={{ scale }}>
        <img src={ctaMary} alt="Vierge Marie" className="w-full h-full object-cover" loading="lazy" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,55%,5%,0.8)] via-[hsl(220,55%,5%,0.6)] to-[hsl(220,55%,5%,0.8)]" />

      <motion.div
        className="relative z-10 text-center px-4 max-w-2xl mx-auto"
        style={{ opacity }}
      >
        <motion.p
          className="text-xs tracking-[0.4em] uppercase text-cathedral-gold/70 mb-3 font-inter"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('cta.togetherInChrist')}
        </motion.p>
        <motion.h2
          className="text-3xl md:text-5xl font-cinzel font-bold text-white mb-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {t('cta.joinOurCommunity')}
        </motion.h2>
        <motion.p
          className="text-white/60 text-sm mb-8 leading-relaxed font-inter"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {t('cta.ctaDescription')}
        </motion.p>
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Button
            size="default"
            asChild
            className="bg-cathedral-gold text-secondary font-semibold hover:bg-cathedral-gold/90 shadow-lg shadow-cathedral-gold/20 rounded-full font-cinzel tracking-wider"
          >
            <Link to="/auth">{t('cta.createAccount')}</Link>
          </Button>
          <Button size="default" className="bg-stained-emerald hover:bg-stained-emerald/90 text-white rounded-full" asChild>
            <a href="https://chat.whatsapp.com/FfvCe9nHwpj5OYoDZBfGER" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1.5 w-4 h-4" />WhatsApp
            </a>
          </Button>
          <Button size="default" variant="outline" className="border-white/25 text-white hover:bg-white/10 rounded-full" asChild>
            <a href="https://youtube.com/@voie-verite-vie?si=qD8LmbyREJdQm1Db" target="_blank" rel="noopener noreferrer">
              <Youtube className="mr-1.5 w-4 h-4" />YouTube
            </a>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export { ActivitiesSection, CTASection };
