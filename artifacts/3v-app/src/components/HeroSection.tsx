import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import bibleBooksData from '@/data/bible-books.json';
import { loadBibleChapter } from '@/lib/bible-content-loader';
import heroCathedral from '@/assets/hero-cathedral-interior.jpg';
import logo3v from '@/assets/logo-3v.png';
import AnimatedLogo from './AnimatedLogo';

function getTimeGreeting(t: (key: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t('hero.goodMorning');
  if (h < 18) return t('hero.goodAfternoon');
  return t('hero.goodEvening');
}

function getPersonalPrayer(fullName: string | null, t: (key: string, opts?: any) => string): string {
  const firstName = fullName?.split(' ')[0] || '';
  const name = firstName || t('common.member');
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const prayers = [
    t('prayers.prayer1', { name }),
    t('prayers.prayer2', { name }),
    t('prayers.prayer3', { name }),
    t('prayers.prayer4', { name }),
    t('prayers.prayer5', { name }),
    t('prayers.prayer6', { name }),
    t('prayers.prayer7', { name }),
  ];
  return prayers[dayOfYear % prayers.length];
}

const fallbackVersesByLang: Record<string, DisplayVerse[]> = {
  fr: [
    { text: "Je suis le chemin, la vérité et la vie.", ref: "Jean 14:6" },
    { text: "Vous connaîtrez la vérité, et la vérité vous affranchira.", ref: "Jean 8:32" },
    { text: "Ta parole est une lampe à mes pieds, une lumière sur mon sentier.", ref: "Psaume 119:105" },
    { text: "Tout est possible à celui qui croit.", ref: "Marc 9:23" },
  ],
  en: [
    { text: "I am the way, the truth, and the life.", ref: "John 14:6" },
    { text: "You will know the truth, and the truth will set you free.", ref: "John 8:32" },
    { text: "Your word is a lamp to my feet, a light on my path.", ref: "Psalm 119:105" },
    { text: "Everything is possible for one who believes.", ref: "Mark 9:23" },
  ],
  it: [
    { text: "Io sono la via, la verità e la vita.", ref: "Giovanni 14:6" },
    { text: "Conoscerete la verità e la verità vi farà liberi.", ref: "Giovanni 8:32" },
    { text: "La tua parola è lampada ai miei passi, luce sul mio cammino.", ref: "Salmo 119:105" },
    { text: "Tutto è possibile per chi crede.", ref: "Marco 9:23" },
  ],
};

interface TodayReading {
  books: string;
  chapters: string;
  day_number: number;
}

interface DisplayVerse {
  text: string;
  ref: string;
}

function bookNameToFileName(frenchName: string): string | null {
  const book = (bibleBooksData.books as any[]).find(
    (b) => b.name.toLowerCase() === frenchName.trim().toLowerCase()
  );
  return book?.fileName || null;
}

function parseChapters(chapters: string): number[] {
  const result: number[] = [];
  for (const part of chapters.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const n = Number(trimmed);
      if (!isNaN(n)) result.push(n);
    }
  }
  return result;
}

const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.language?.split('-')[0] || 'fr';
  const fallbackVerses = fallbackVersesByLang[lang] || fallbackVersesByLang.fr;
  const [currentVerse, setCurrentVerse] = useState(0);
  const [todayReading, setTodayReading] = useState<TodayReading | null>(null);
  const [verses, setVerses] = useState<DisplayVerse[]>(fallbackVerses);

  const userName = useMemo(() => {
    const metaName = (user?.user_metadata as any)?.full_name as string | undefined;
    return metaName || user?.email?.split('@')[0] || '';
  }, [user]);

  const todayPrayer = useMemo(() => {
    return getPersonalPrayer(userName || null, t);
  }, [userName, t]);

  // FIX: Reset verses when language changes (bible content is French-only)
  useEffect(() => {
    if (lang !== 'fr') {
      setVerses(fallbackVersesByLang[lang] || fallbackVersesByLang.fr);
    }
  }, [lang]);

  const loadTodayVerses = useCallback(async () => {
    // Bible content files are in French only — skip DB verse loading for other languages
    if (lang !== 'fr') return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await (supabase as any)
        .from('biblical_readings')
        .select('books, chapters, day_number')
        .eq('date', today)
        .limit(1)
        .single();

      if (!data) return;
      setTodayReading(data);

      const fileName = bookNameToFileName(data.books);
      if (!fileName) return;

      const chapterNums = parseChapters(data.chapters);
      const allVerses: DisplayVerse[] = [];

      for (const chNum of chapterNums) {
        const chVerses = await loadBibleChapter(fileName, chNum);
        if (chVerses && chVerses.length > 0) {
          const step = Math.max(1, Math.floor(chVerses.length / 4));
          for (let i = 0; i < chVerses.length; i += step) {
            const v = chVerses[i];
            if (v.text && v.text.trim().length > 20 && v.text.trim().length < 200) {
              allVerses.push({
                text: v.text.trim(),
                ref: `${data.books} ${chNum}:${v.number}`,
              });
            }
          }
        }
      }

      if (allVerses.length > 0) {
        setVerses(allVerses);
      }
    } catch (e) {
      // Keep fallback verses
    }
  }, [lang]);

  useEffect(() => {
    loadTodayVerses();
  }, [loadTodayVerses]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVerse((prev) => (prev + 1) % verses.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [verses.length]);

  const titleWords = [t('brand.word1'), t('brand.word2'), t('brand.word3')];

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      {/* Background with Ken Burns effect */}
      <div className="absolute inset-0 z-0">
        <motion.img
          src={heroCathedral}
          alt=""
          className="w-full h-full object-cover"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,55%,8%,0.75)] via-[hsl(220,55%,8%,0.55)] to-[hsl(220,55%,8%,0.85)]" />
        {/* Golden light glow */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(43,65%,52%,0.12)]"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-2xl mx-auto flex flex-col items-center pt-24 pb-12">
        {/* Animated Logo */}
        <motion.div
          className="relative mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <AnimatedLogo size="xl" />
        </motion.div>

        {/* Title with staggered gold animation */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl font-cinzel font-bold text-white mb-4 leading-none tracking-wide flex flex-wrap items-center justify-center gap-x-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {titleWords.map((word, i) => (
            <motion.span
              key={word}
              className={i === 2 ? "text-cathedral-gold" : "text-white"}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.2 }}
              style={{ textShadow: '0 2px 20px rgba(201, 168, 76, 0.3)' }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* Cathedral gold divider */}
        <motion.div
          className="w-24 h-[1px] mb-6"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(43, 65%, 52%), transparent)' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.9 }}
        />

        <motion.p
          className="text-white/70 text-sm sm:text-base mb-6 max-w-md leading-relaxed font-inter tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* Personalized greeting card */}
        {user && (
          <motion.div
            className="w-full max-w-md mb-8 rounded-xl border border-[hsl(43,65%,52%,0.25)] bg-[hsl(220,55%,12%,0.5)] backdrop-blur-md px-6 py-5 text-left"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <p className="text-white font-semibold text-base mb-1.5 font-playfair">
              {getTimeGreeting(t)}{userName ? `, ${userName}` : ''} 🙏
            </p>
            <p className="text-white/60 text-sm italic leading-relaxed font-inter">
              « {todayPrayer} »
            </p>
            {todayReading && (
              <Link
                to="/biblical-reading"
                className="mt-3 flex items-center gap-2 text-cathedral-gold text-xs font-medium hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 {t('hero.readingOfDay', { books: todayReading.books, chapters: todayReading.chapters, day: todayReading.day_number })}</span>
              </Link>
            )}
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mb-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <Button
            size="lg"
            asChild
            className="w-full sm:w-auto px-8 py-5 bg-cathedral-gold text-secondary font-semibold hover:bg-cathedral-gold/90 shadow-xl shadow-cathedral-gold/20 rounded-full font-cinzel tracking-wider"
          >
            <Link to="/auth">
              <Users className="mr-2 w-5 h-5" />
              {t('common.joinUs')}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="w-full sm:w-auto px-8 py-5 border-white/30 text-white bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm"
          >
            <Link to="/about">
              {t('common.learnMore')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Rotating verses */}
        <motion.div
          className="w-full max-w-lg min-h-[4rem] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={currentVerse}
              className="text-white/60 text-xs sm:text-sm font-playfair italic text-center leading-relaxed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              « {verses[currentVerse]?.text} »
              <span className="block text-cathedral-gold/80 text-[10px] sm:text-xs mt-1 not-italic font-medium tracking-wider">
                — {verses[currentVerse]?.ref}
              </span>
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bottom scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-cathedral-gold/60" />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
