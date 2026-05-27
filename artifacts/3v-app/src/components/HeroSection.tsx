/**
 * HeroSection — version refonte complète
 *
 * Structure (sans logo ni titre — déplacés dans la navbar) :
 *   1. Bande couleur liturgique (top)
 *   2. Carrousel d'actualités en fondu (plateforme + monde + local)
 *   3. Carte de salutation genrée + prière
 *   4. Verset du jour + fête du jour
 *   5. Boutons CTA (visiteurs non connectés uniquement)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, BookOpen, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import bibleBooksData from '@/data/bible-books.json';
import { loadBibleChapter } from '@/lib/bible-content-loader';
import { getLiturgicalDay, liturgicalEmoji } from '@/lib/liturgicalCalendar';
import { checkFeastToday, loadFeasts } from '@/lib/christian-feasts';
import heroCathedral from '@/assets/hero-cathedral-interior.jpg';

// ── Couleur liturgique du jour (calculée une seule fois) ──────────────────────
const lit = getLiturgicalDay(new Date());

// ── Salutation horaire ────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ── Prière genrée (change chaque jour) ───────────────────────────────────────
function getGenderedPrayer(firstName: string, gender: 'homme' | 'femme' | null): string {
  const name = firstName || (gender === 'femme' ? 'ma sœur' : 'mon frère');
  const beni = gender === 'femme' ? 'bénie' : 'béni';
  const cher = gender === 'femme' ? 'Chère sœur' : 'Cher frère';

  const prayers = [
    `Que le Seigneur vous garde ${beni}, ${name}, et guide vos pas en ce ${lit.season.toLowerCase()}.`,
    `${cher} ${name}, que la paix du Christ soit avec vous aujourd'hui et toujours.`,
    `Que la grâce de Dieu vous enveloppe, ${name}, et renouvelle votre force intérieure.`,
    `${cher} ${name}, puissiez-vous sentir la tendresse de Dieu à chaque instant de ce jour.`,
    `Que le Seigneur soit votre lumière et votre bouclier aujourd'hui, ${name}.`,
    `${cher} ${name}, que la joie de l'Évangile illumine votre journée et celles de vos proches.`,
    `Que l'Esprit Saint vous guide et vous comble de ses dons, ${name}, en ce ${lit.season.toLowerCase()}.`,
  ];

  const day = Math.floor(Date.now() / 86_400_000);
  return prayers[day % prayers.length];
}

// ── Types carrousel ───────────────────────────────────────────────────────────
interface CarouselItem {
  key: string;
  type: 'platform' | 'world' | 'local';
  badge: string;
  badgeIcon: string;
  title: string;
  excerpt?: string;
  href: string;
  isExternal: boolean;
  country?: string;
}

// ── RSS helpers ───────────────────────────────────────────────────────────────
const RSS_WORLD = 'https://www.vaticannews.va/fr.rss.xml';
const RSS_BY_COUNTRY: Record<string, string> = {
  CM: 'https://www.imedias.eu/feed/',
  SN: 'https://www.imedias.eu/feed/',
  CI: 'https://www.imedias.eu/feed/',
  FR: 'https://eglise.catholique.fr/feed/',
  BE: 'https://www.cathobel.be/feed/',
  US: 'https://www.catholicnewsagency.com/feed',
};

async function fetchRssItems(url: string, count = 3): Promise<{ title: string; description: string; link: string }[]> {
  try {
    const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=${count}`;
    const res = await fetch(api, { signal: AbortSignal.timeout(7000) });
    const data = await res.json();
    return data.status === 'ok' ? data.items : [];
  } catch { return []; }
}

async function detectCountryCode(): Promise<{ code: string; name: string }> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const d = await res.json();
    return { code: d.country_code || 'FR', name: d.country_name || 'France' };
  } catch { return { code: 'FR', name: 'France' }; }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ══════════════════════════════════════════════════════════════════════════════
// Carrousel Actualités
// ══════════════════════════════════════════════════════════════════════════════
const HeroNewsCarousel = () => {
  const [items, setItems]     = useState<CarouselItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedRef            = useRef(false);

  // Charger les news en arrière-plan (plateforme → monde → local)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async () => {
      const all: CarouselItem[] = [];

      // 1. Actualités plateforme (Supabase)
      try {
        const { data } = await (supabase as any)
          .from('news_posts')
          .select('id, title, excerpt, category')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(3);

        for (const p of (data || [])) {
          all.push({
            key: `platform-${p.id}`,
            type: 'platform',
            badge: p.category === 'event' ? '📅 Événement' : p.category === 'announcement' ? '📢 Annonce' : '🏛️ Association',
            badgeIcon: '🏛️',
            title: p.title,
            excerpt: p.excerpt || undefined,
            href: `/actualites/${p.id}`,
            isExternal: false,
          });
        }
      } catch {}

      setItems([...all]);
      if (all.length > 0) setLoading(false);

      // 2. Actualités monde (Vatican News)
      const worldItems = await fetchRssItems(RSS_WORLD, 3);
      for (const w of worldItems) {
        all.push({
          key: `world-${w.link}`,
          type: 'world',
          badge: '🌍 Monde catholique',
          badgeIcon: '🌍',
          title: w.title,
          excerpt: stripHtml(w.description || '').slice(0, 140) || undefined,
          href: w.link,
          isExternal: true,
        });
      }

      // 3. Actualités locales
      const geo = await detectCountryCode();
      const localUrl = RSS_BY_COUNTRY[geo.code];
      if (localUrl) {
        const localItems = await fetchRssItems(localUrl, 2);
        for (const l of localItems) {
          all.push({
            key: `local-${l.link}`,
            type: 'local',
            badge: `📍 ${geo.name}`,
            badgeIcon: '📍',
            title: l.title,
            excerpt: stripHtml(l.description || '').slice(0, 140) || undefined,
            href: l.link,
            isExternal: true,
            country: geo.name,
          });
        }
      }

      // Fallback si vraiment rien
      if (all.length === 0) {
        all.push({
          key: 'fallback',
          type: 'platform',
          badge: '✝️ Voie Vérité Vie',
          badgeIcon: '✝️',
          title: 'Bienvenue dans la communauté Voie Vérité Vie',
          excerpt: 'Rejoignez-nous pour vivre la foi ensemble : prière, lecture biblique, appels & lives, témoignages…',
          href: '/about',
          isExternal: false,
        });
      }

      setItems([...all]);
      setLoading(false);
    };

    void load();
  }, []);

  // Auto-avancement
  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % items.length);
    }, 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  const prev = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent((c) => (c - 1 + items.length) % items.length);
  };
  const next = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent((c) => (c + 1) % items.length);
  };
  const goTo = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent(i);
  };

  if (loading && items.length === 0) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 min-h-[140px] animate-pulse">
        <div className="h-3 bg-white/10 rounded w-24 mb-4" />
        <div className="h-5 bg-white/15 rounded w-4/5 mb-2" />
        <div className="h-4 bg-white/10 rounded w-full mb-1" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
    );
  }

  const item = items[current];
  if (!item) return null;

  return (
    <div className="w-full max-w-xl relative">
      {/* Slide */}
      <div
        className="rounded-2xl border backdrop-blur-md overflow-hidden"
        style={{ borderColor: lit.colorHex + '35', backgroundColor: 'rgba(15,22,40,0.65)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="px-5 py-5"
          >
            {/* Badge */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                style={{ color: lit.colorHex, borderColor: lit.colorHex + '60', backgroundColor: lit.colorHex + '18' }}
              >
                {item.badge}
              </span>
              <span className="text-white/25 text-[10px]">
                {current + 1}/{items.length}
              </span>
            </div>

            {/* Titre */}
            <h2 className="text-white font-cinzel font-bold text-base sm:text-lg leading-snug line-clamp-2 mb-2">
              {item.title}
            </h2>

            {/* Extrait */}
            {item.excerpt && (
              <p className="text-white/55 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-3">
                {item.excerpt}
              </p>
            )}

            {/* Lien */}
            <div className="flex items-center justify-between">
              {item.isExternal ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: lit.colorHex }}>
                  Lire la suite <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <Link to={item.href}
                  className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: lit.colorHex }}>
                  Lire la suite <ArrowRight className="w-3 h-3" />
                </Link>
              )}

              {/* Flèches de navigation */}
              {items.length > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={prev}
                    className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={next}
                    className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Points de progression */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? '1.5rem' : '0.375rem',
                height: '0.375rem',
                backgroundColor: i === current ? lit.colorHex : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// Versets tournants
// ══════════════════════════════════════════════════════════════════════════════
interface DisplayVerse { text: string; ref: string; }
interface TodayReading { books: string; chapters: string; day_number: number; }

const FALLBACK_VERSES: DisplayVerse[] = [
  { text: 'Je suis le chemin, la vérité et la vie.',                          ref: 'Jean 14:6'        },
  { text: 'Vous connaîtrez la vérité, et la vérité vous affranchira.',        ref: 'Jean 8:32'        },
  { text: 'Ta parole est une lampe à mes pieds, une lumière sur mon sentier.',ref: 'Psaume 119:105'   },
  { text: 'Tout est possible à celui qui croit.',                              ref: 'Marc 9:23'        },
  { text: 'Venez à moi, vous tous qui êtes fatigués et chargés.',             ref: 'Matthieu 11:28'   },
];

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

// ══════════════════════════════════════════════════════════════════════════════
// HeroSection principal
// ══════════════════════════════════════════════════════════════════════════════
const HeroSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [currentVerse, setCurrentVerse] = useState(0);
  const [verses, setVerses]             = useState<DisplayVerse[]>(FALLBACK_VERSES);
  const [todayReading, setTodayReading] = useState<TodayReading | null>(null);
  const [todayFeast, setTodayFeast]     = useState<{ name: string; message: string; color: string } | null>(null);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  // Prière genrée
  const prayer = useMemo(
    () => user ? getGenderedPrayer(firstName, user.gender ?? null) : '',
    [user, firstName]
  );

  // Fête du jour
  useEffect(() => {
    const feasts = loadFeasts();
    const feast = checkFeastToday(feasts);
    if (feast) setTodayFeast({ name: feast.name, message: feast.message, color: feast.color });
  }, []);

  // Versets du jour (Bible)
  const loadTodayVerses = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadTodayVerses(); }, [loadTodayVerses]);

  useEffect(() => {
    const id = setInterval(() => setCurrentVerse((p) => (p + 1) % verses.length), 6000);
    return () => clearInterval(id);
  }, [verses.length]);

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">

      {/* Arrière-plan */}
      <div className="absolute inset-0 z-0">
        <motion.img
          src={heroCathedral} alt=""
          className="w-full h-full object-cover"
          initial={{ scale: 1.12 }} animate={{ scale: 1 }}
          transition={{ duration: 20, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,55%,5%,0.85)] via-[hsl(220,55%,8%,0.65)] to-[hsl(220,55%,8%,0.92)]" />
        {/* Halo couleur liturgique */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ backgroundColor: lit.colorHex + '12' }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Bande liturgique (top) */}
      <div className="absolute top-0 left-0 right-0 z-20 h-[3px]" style={{ backgroundColor: lit.colorHex }} />

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-6 pt-24 pb-12">

        {/* ── Badge saison liturgique ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium"
            style={{ borderColor: lit.colorHex + '70', color: lit.colorHex, backgroundColor: lit.colorHex + '18' }}
          >
            {liturgicalEmoji(lit.color)} {lit.season} — {lit.colorLabel}
          </span>
        </motion.div>

        {/* ══ 1. CARROUSEL ACTUALITÉS ══ */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <HeroNewsCarousel />
        </motion.div>

        {/* ══ 2. CARTE SALUTATION (utilisateurs connectés) ══ */}
        {user && (
          <motion.div
            className="w-full rounded-2xl border backdrop-blur-md px-5 py-4 text-left"
            style={{ borderColor: lit.colorHex + '40', backgroundColor: 'rgba(15,22,40,0.55)' }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <p className="text-white font-semibold text-base mb-1 font-playfair">
              {getGreeting()}{firstName ? `, ${firstName}` : ''} 🙏
            </p>
            <p className="text-white/60 text-sm italic leading-relaxed font-inter">
              « {prayer} »
            </p>
            {todayReading && (
              <Link to="/biblical-reading"
                className="mt-2.5 flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                style={{ color: lit.colorHex }}>
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 Lecture du jour — {todayReading.books} {todayReading.chapters}</span>
              </Link>
            )}
          </motion.div>
        )}

        {/* ══ 3. VERSET + FÊTE DU JOUR ══ */}
        <motion.div
          className="w-full flex flex-col items-center gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {/* Verset tournant */}
          <div className="w-full max-w-lg min-h-[4rem] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentVerse}
                className="text-white/65 text-xs sm:text-sm font-playfair italic text-center leading-relaxed"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
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
          </div>

          {/* Fête du jour (si applicable) */}
          {todayFeast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
            >
              <span className="text-sm">🕊️</span>
              <span className="text-white/70 text-xs font-medium">{todayFeast.name}</span>
            </motion.div>
          )}
        </motion.div>

        {/* ══ 4. CTA VISITEURS (non connectés seulement) ══ */}
        {!user && (
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-3 w-full"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              size="lg" asChild
              className="w-full sm:w-auto px-8 py-5 font-semibold shadow-xl rounded-full font-cinzel tracking-wider text-white border-0"
              style={{ backgroundColor: lit.colorHex, boxShadow: `0 8px 30px ${lit.colorHex}45` }}
            >
              <Link to="/auth">
                <Users className="mr-2 w-5 h-5" />
                {t('common.joinUs')}
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild
              className="w-full sm:w-auto px-8 py-5 border-white/30 text-white bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm">
              <Link to="/about">
                {t('common.learnMore')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
