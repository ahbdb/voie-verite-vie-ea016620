import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import missionVoie from '@/assets/mission-voie.jpg';
import missionVerite from '@/assets/mission-verite.jpg';
import missionVie from '@/assets/mission-vie.jpg';

const MissionSection = () => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

  const missions = [
    {
      title: t('mission.way'),
      subtitle: t('mission.waySubtitle'),
      verse: t('mission.wayVerse'),
      ref: 'Jean 14:6',
      description: t('mission.wayDescription'),
      image: missionVoie,
      accent: 'cathedral-gold',
    },
    {
      title: t('mission.truth'),
      subtitle: t('mission.truthSubtitle'),
      verse: t('mission.truthVerse'),
      ref: 'Jean 8:32',
      description: t('mission.truthDescription'),
      image: missionVerite,
      accent: 'stained-blue',
    },
    {
      title: t('mission.life'),
      subtitle: t('mission.lifeSubtitle'),
      verse: t('mission.lifeVerse'),
      ref: 'Jean 10:10',
      description: t('mission.lifeDescription'),
      image: missionVie,
      accent: 'stained-emerald',
    },
  ];

  return (
    <section ref={sectionRef} className="relative py-20 overflow-hidden bg-background">
      {/* Decorative gold line */}
      <div className="cathedral-line w-full mb-16" />
      
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground mb-3 font-inter">{t('mission.ourMission')}</p>
          <h2 className="text-4xl md:text-5xl font-cinzel font-bold text-foreground mb-4">
            {t('mission.threePillars')}
          </h2>
          <div className="cathedral-line w-20 mx-auto" />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {missions.map((mission, index) => (
            <motion.div
              key={mission.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
               <motion.div
                className="group relative rounded-2xl overflow-hidden h-[440px] shadow-cathedral"
                whileHover={{ y: -8, rotateY: 3, rotateX: -2 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                style={{ perspective: 800, transformStyle: 'preserve-3d' }}
              >
                {/* Shimmer sweep on hover */}
                <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                <motion.img
                  src={mission.image}
                  alt={mission.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.8 }}
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,55%,5%,0.9)] via-[hsl(220,55%,5%,0.3)] to-transparent" />
                
                {/* Gold accent line at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cathedral-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="absolute inset-0 flex flex-col justify-end p-7">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-cathedral-gold/70 mb-2 font-inter">{mission.subtitle}</p>
                  <h3 className="text-3xl font-cinzel font-bold text-white mb-3">{mission.title}</h3>
                  <p className="text-white/65 text-sm leading-relaxed mb-3 font-inter">{mission.description}</p>
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-cathedral-gold/80 text-sm italic font-playfair">
                      {mission.verse}
                      <span className="block text-white/30 text-xs mt-1 not-italic font-inter">— {mission.ref}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="cathedral-line w-full mt-20" />
    </section>
  );
};

export default MissionSection;
