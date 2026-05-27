import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import bibleBooksData from '@/data/bible-books.json';
import { loadBibleChapter } from '@/lib/bible-content-loader';
import { getLiturgicalDay, liturgicalEmoji } from '@/lib/liturgicalCalendar';
import heroCathedral from '@/assets/hero-cathedral-interior.jpg';
import AnimatedLogo from './AnimatedLogo';

// ── Liturgical day (memoised once per render tree) ──────────────────────────
const lit = getLiturgicalDay(new Date());

// ── Salutation horaire ──────────────────────────────────────────────────────
function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ── Prière genrée (roule chaque jour) ──────────────────────────────────────
function getGenderedPrayer(
  firstName: string,
  gender: 'homme' | 'femme' | null,
  season: string,
): string {
  const name  = firstName || (gender === 'femme' ? 'ma sœur' : 'mon frère');
  const beni  = gender === 'femme' ? 'bénie' : 'béni';
  const cher  = gender === 'femme' ? 'Chère sœur' : 'Cher frère';

  const prayers = [
    `Que le Seigneur vous garde ${beni}, ${name}, et guide vos pas en ce ${season.toLowerCase()}.`,
    `${cher} ${name}, que la paix du Christ soit avec vous aujourd'hui et toujours.`,
    `Que la grâce de Dieu vous enveloppe, ${name}, et renouvelle votre force intérieure.`,
    `${cher} ${name}, puissiez-vous sentir la tendresse de Dieu à chaque instant de ce jour.`,
    `Que le Seigneur soit votre lumière et votre bouclier aujourd'hui, ${name}.`,
    `${cher} ${name}, que la joie de l'Évangile illumine votre journée et celles de vos proches.`,
    `Que l'Esprit Saint vous guide et vous comble de ses dons, ${name}, en ce ${season.toLowerCase()}.`,
  ];

  const day = Math.floor(Date.now() / 86_400_000);
  return prayers[day % prayers.length];
}

// ── Fallback verses ──────────────────────────────────────────────────────────
const FALLBACK_VERSES: { text: string; ref: string }[] = [
  { text: 'Je suis le chemin, la vérité et la vie.',             ref: 'Jean 14:6'       },
  { text: 'Vous connaîtrez la vérité, et la vérité vous affranchira.', ref: 'Jean 8:32'  },
  { text: 'Ta parole est une lampe à mes pieds, une lumière sur mon sentier.', ref: 'Psaume 119:105' },
  { text: 'Tout est possible à celui qui croit.',                 ref: 'Marc 9:23'       },
];

interface TodayReading { books: string; chapters: string; day_number: number; }
interface DisplayVerse  { text: string; ref: string; }

function bookNameToFileName(name: string): string | null {
  const b = (bibleBooksData.books as any[]).find(
    (b) => b.name.toLowerCase() === name.trim().toLowerCase()
  );
  return b?.fileName || null;
}

function parseChapters(chapters: string): number[] {
  const result: number[] = [];
  for (const part of chapters.split(',')) {
    const t = part.trim();
    if (t.includes('-')) {
      const [s, e] = t.split('-').map(Number);
      for (let i = s; i <= e; i++) result.push(i);
    } else {
      const n = Number(t);
      if (!isNaN(n)) result.push(n);
    }
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.language?.split('-')[0] || 'fr';

  const [currentVerse, setCurrentVerse] = useState(0);
  const [todayReading, setTodayReading] = useState<TodayReading | null>(null);
  const [verses, setVerses] = useState<DisplayVerse[]>(FALLBACK_VERSES);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  const prayer = useMemo(() => {
    if (!user) return '';
    return getGenderedPrayer(firstName, user.gender ?? null, lit.season);
  }, [user, firstName]);

  const loadTodayVerses = useCallback(async () => {
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
      const chNums = parseChapters(data.chapters);
      const all: DisplayVerse[] = [];
      for (const ch of chNums) {
        const vs = await loadBibleChapter(fileName, ch);
        if (vs?.length) {
          const step = Math.max(1, Math.floor(vs.length / 4));
          for (let i = 0; i < vs.length; i += step) {
            const v = vs[i];
            if (v.text?.trim().length > 20 && v.text.trim().length < 200) {
              all.push({ text: v.text.trim(), ref: `${data.books} ${ch}:${v.number}` });
            }
          }
        }
      }
      if (all.length > 0) setVerses(all);
    } catch { /* keep fallback */ }
  }, [lang]);

  useEffect(() => { loadTodayVerses(); }, [loadTodayVerses]);

  useEffect(() => {
    const id = setInterval(() => setCurrentVerse((p) => (p + 1) % verses.length), 5000);
    return () => clearInterval(id);
  }, [verses.length]);

  const titleWords = [t('brand.word1'), t('brand.word2'), t('brand.word3')];

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">

      {/* ── Arrière-plan ── */}
      <div className="absolute inset-0 z-0">
        <motion.img
          src={heroCathedral} alt=""
          className="w-full h-full object-cover"
          initial={{ scale: 1.15 }} animate={{ scale: 1 }}
          transition={{ duration: 20, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,55%,8%,0.75)] via-[hsl(220,55%,8%,0.55)] to-[hsl(220,55%,8%,0.85)]" />
        {/* Halo liturgique (couleur du jour) */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ backgroundColor: lit.colorHex + '18' }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Bande couleur liturgique (top) ── */}
      <div
        className="absolute top-0 left-0 right-0 z-20 h-1"
        style={{ backgroundColor: lit.colorHex }}
      />

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-2xl mx-auto flex flex-col items-center pt-24 pb-12">

        {/* Badge saison liturgique */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium"
            style={{
              borderColor: lit.colorHex + '70',
              color: lit.colorHex,
              backgroundColor: lit.colorHex + '18',
            }}
          >
            {liturgicalEmoji(lit.color)} {lit.season} — couleur liturgique : {lit.colorLabel}
          </span>
        </motion.div>

        {/* Logo animé */}
        <motion.div
          className="relative mb-8"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <AnimatedLogo size="xl" />
        </motion.div>

        {/* Titre */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl font-cinzel font-bold text-white mb-4 leading-none tracking-wide flex flex-wrap items-center justify-center gap-x-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        >
          {titleWords.map((word, i) => (
            <motion.span
              key={word}
              style={{
                color: i === 2 ? lit.colorHex : '#ffffff',
                textShadow: `0 2px 20px ${lit.colorHex}50`,
              }}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.2 }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* Filet */}
        <motion.div
          className="w-24 h-[1px] mb-6"
          style={{ background: `linear-gradient(90deg, transparent, ${lit.colorHex}, transparent)` }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.9 }}
        />

        <motion.p
          className="text-white/70 text-sm sm:text-base mb-6 max-w-md leading-relaxed font-inter tracking-wide"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* ── Carte de salutation personnalisée ── */}
        {user && (
          <motion.div
            className="w-full max-w-md mb-8 rounded-xl border backdrop-blur-md px-6 py-5 text-left"
            style={{ borderColor: lit.colorHex + '40', backgroundColor: 'hsl(220,55%,12%,0.5)' }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <p className="text-white font-semibold text-base mb-1.5 font-playfair">
              {getTimeGreeting()}{firstName ? `, ${firstName}` : ''} 🙏
            </p>
            <p className="text-white/60 text-sm italic leading-relaxed font-inter">
              « {prayer} »
            </p>
            {todayReading && (
              <Link to="/biblical-reading"
                className="mt-3 flex items-center gap-2 text-xs font-medium hover:underline"
                style={{ color: lit.colorHex }}>
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 {t('hero.readingOfDay', { books: todayReading.books, chapters: todayReading.chapters, day: todayReading.day_number })}</span>
              </Link>
            )}
          </motion.div>
        )}

        {/* ── CTA visiteurs non connectés ── */}
        {!user && (
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mb-8"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <Button
              size="lg" asChild
              className="w-full sm:w-auto px-8 py-5 font-semibold shadow-xl rounded-full font-cinzel tracking-wider text-white"
              style={{ backgroundColor: lit.colorHex, boxShadow: `0 8px 30px ${lit.colorHex}40` }}
            >
              <Link to="/auth">
                <Users className="mr-2 w-5 h-5" />
                {t('common.joinUs')}
              </Link>
            </Button>
            <Button
              variant="outline" size="lg" asChild
              className="w-full sm:w-auto px-8 py-5 border-white/30 text-white bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm"
            >
              <Link to="/about">
                {t('common.learnMore')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        )}

        {/* ── Versets tournants ── */}
        <motion.div
          className="w-full max-w-lg min-h-[4rem] flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={currentVerse}
              className="text-white/60 text-xs sm:text-sm font-playfair italic text-center leading-relaxed"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            >
              « {verses[currentVerse]?.text} »
              <span
                className="block text-[10px] sm:text-xs mt-1 not-italic font-medium tracking-wider"
                style={{ color: lit.colorHex + 'cc' }}
              >
                — {verses[currentVerse]?.ref}
              </span>
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
