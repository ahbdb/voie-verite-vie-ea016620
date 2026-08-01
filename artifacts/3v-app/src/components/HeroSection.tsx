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
import { Users, ArrowRight, BookOpen, ExternalLink, ChevronLeft, ChevronRight, Sparkles, Heart, Newspaper, CalendarDays, Globe2, Landmark, Cross } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import bibleBooksData from '@/data/bible-books.json';
import { loadBibleChapter } from '@/lib/bible-content-loader';
import { getLiturgicalDay, liturgicalEmoji } from '@/lib/liturgicalCalendar';
import { checkFeastToday, loadFeasts } from '@/lib/christian-feasts';
import heroCathedral from '@/assets/hero-cathedral-interior.jpg';

// ── Images quotidiennes liées à l'Évangile (art catholique domaine public) ──
// Proxy via wsrv.nl pour contourner le hotlink + servir en WebP optimisé
const GOSPEL_IMAGES_BY_SEASON: Record<string, string[]> = {
  'Avent': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Tissot_Annunciation.jpg/1280px-Tissot_Annunciation.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/James_Tissot_-_The_Visitation.jpg/960px-James_Tissot_-_The_Visitation.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/CARAVAGGIO_-_Natividad_%28Museo_de_Bellas_Artes_de_Palermo%2C_1609%29.jpg/1280px-CARAVAGGIO_-_Natividad_%28Museo_de_Bellas_Artes_de_Palermo%2C_1609%29.jpg',
  ],
  'Noël': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/The_nativity_Gerard_van_Honthorst_1622.jpg/1280px-The_nativity_Gerard_van_Honthorst_1622.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Adoration_of_the_Magi_-_Bartolom%C3%A9_Esteban_Murillo.jpg/1280px-Adoration_of_the_Magi_-_Bartolom%C3%A9_Esteban_Murillo.jpg',
  ],
  'Carême': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/ChristInTheWilderness-IvanKramskoy1872.jpg/1280px-ChristInTheWilderness-IvanKramskoy1872.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Cristo_crucificado.jpg/800px-Cristo_crucificado.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Carl_Heinrich_Bloch_-_The_Sermon_on_the_Mount.jpg/1280px-Carl_Heinrich_Bloch_-_The_Sermon_on_the_Mount.jpg',
  ],
  'Semaine Sainte': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tissot_The_Washing_of_the_Feet.jpg/1280px-Tissot_The_Washing_of_the_Feet.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Tissot_Jesus_Wept.jpg/960px-Tissot_Jesus_Wept.jpg',
  ],
  'Pâques': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Carl_Bloch_-_The_Resurrection.jpg/1280px-Carl_Bloch_-_The_Resurrection.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Road_to_Emmaus_appearance.jpg/1280px-Road_to_Emmaus_appearance.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Doubting_thomas_guercino.jpg/1280px-Doubting_thomas_guercino.jpg',
  ],
  'Pentecôte': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/The_Descent_of_the_Holy_Spirit.jpg/960px-The_Descent_of_the_Holy_Spirit.jpg',
  ],
  default: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Carl_Heinrich_Bloch_-_The_Sermon_on_the_Mount.jpg/1280px-Carl_Heinrich_Bloch_-_The_Sermon_on_the_Mount.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Tissot_The_Feeding_of_the_Five_Thousand.jpg/1280px-Tissot_The_Feeding_of_the_Five_Thousand.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Baptism-of-Christ-Verrocchio-Leonardo.jpg/1280px-Baptism-of-Christ-Verrocchio-Leonardo.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Tissot_The_Calling_of_Saint_Matthew.jpg/1280px-Tissot_The_Calling_of_Saint_Matthew.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Tissot_Jesus_Wept.jpg/960px-Tissot_Jesus_Wept.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Sermon_on_the_Mount.jpg/1280px-Sermon_on_the_Mount.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Tissot_Jesus_Begins_to_Preach.jpg/1280px-Tissot_Jesus_Begins_to_Preach.jpg',
  ],
};

function seasonalImage(season: string): string {
  const pool = GOSPEL_IMAGES_BY_SEASON[season] ?? GOSPEL_IMAGES_BY_SEASON['default'];
  const dayIndex = Math.floor(Date.now() / 86_400_000) % pool.length;
  return pool[dayIndex];
}

// ── Scènes évangéliques spécifiques — art catholique domaine public ───────────
const SCENE: Record<string, string> = {
  baptism:           'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Baptism-of-Christ-Verrocchio-Leonardo.jpg/1280px-Baptism-of-Christ-Verrocchio-Leonardo.jpg',
  temptation:        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/ChristInTheWilderness-IvanKramskoy1872.jpg/1280px-ChristInTheWilderness-IvanKramskoy1872.jpg',
  calling:           'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Tissot_The_Calling_of_Saint_Matthew.jpg/1280px-Tissot_The_Calling_of_Saint_Matthew.jpg',
  sermon:            'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Carl_Heinrich_Bloch_-_The_Sermon_on_the_Mount.jpg/1280px-Carl_Heinrich_Bloch_-_The_Sermon_on_the_Mount.jpg',
  healing:           'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Tissot_The_Healing_of_the_Paralytic.jpg/1280px-Tissot_The_Healing_of_the_Paralytic.jpg',
  storm:             'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Rembrandt_Christ_in_the_Storm_on_the_Lake_of_Galilee.jpg/1280px-Rembrandt_Christ_in_the_Storm_on_the_Lake_of_Galilee.jpg',
  multiplication:    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Tissot_The_Feeding_of_the_Five_Thousand.jpg/1280px-Tissot_The_Feeding_of_the_Five_Thousand.jpg',
  walking_water:     'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Tissot_Jesus_Walking_on_the_Water.jpg/1280px-Tissot_Jesus_Walking_on_the_Water.jpg',
  transfiguration:   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Transfiguration_Raphael.jpg/1280px-Transfiguration_Raphael.jpg',
  bartimaeus:        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Brooklyn_Museum_-_The_Blind_Bartimaeus_-_James_Tissot_-_overall.jpg/960px-Brooklyn_Museum_-_The_Blind_Bartimaeus_-_James_Tissot_-_overall.jpg',
  good_samaritan:    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Good_Samaritan_Rembrandt.jpg/1280px-Good_Samaritan_Rembrandt.jpg',
  prodigal_son:      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Rembrandt_-_The_Return_of_the_Prodigal_Son.jpg/1024px-Rembrandt_-_The_Return_of_the_Prodigal_Son.jpg',
  entry_jerusalem:   'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Tissot_The_Entry_into_Jerusalem.jpg/1280px-Tissot_The_Entry_into_Jerusalem.jpg',
  washing_feet:      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tissot_The_Washing_of_the_Feet.jpg/1280px-Tissot_The_Washing_of_the_Feet.jpg',
  last_supper:       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/%22The_Last_Supper%22_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg/1280px-%22The_Last_Supper%22_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg',
  gethsemane:        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bloch-Gethsemane.jpg/1280px-Bloch-Gethsemane.jpg',
  crucifixion:       'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Cristo_crucificado.jpg/800px-Cristo_crucificado.jpg',
  resurrection:      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Carl_Bloch_-_The_Resurrection.jpg/1280px-Carl_Bloch_-_The_Resurrection.jpg',
  emmaus:            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Road_to_Emmaus_appearance.jpg/1280px-Road_to_Emmaus_appearance.jpg',
  pentecost:         'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/The_Descent_of_the_Holy_Spirit.jpg/960px-The_Descent_of_the_Holy_Spirit.jpg',
  annunciation:      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Tissot_Annunciation.jpg/960px-Tissot_Annunciation.jpg',
  nativity:          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/The_nativity_Gerard_van_Honthorst_1622.jpg/1280px-The_nativity_Gerard_van_Honthorst_1622.jpg',
  magi:              'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Adoration_of_the_Magi_-_Bartolom%C3%A9_Esteban_Murillo.jpg/1280px-Adoration_of_the_Magi_-_Bartolom%C3%A9_Esteban_Murillo.jpg',
  wedding_cana:      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Paolo_Veronese_-_Wedding_at_Cana.jpg/1280px-Paolo_Veronese_-_Wedding_at_Cana.jpg',
  good_shepherd:     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Carl_Bloch_-_The_Good_Shepherd.jpg/1280px-Carl_Bloch_-_The_Good_Shepherd.jpg',
  lazarus:           'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Rembrandt_The_Raising_of_Lazarus.jpg/1024px-Rembrandt_The_Raising_of_Lazarus.jpg',
  samaritan_woman:   'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Tissot_Jesus_and_the_Samaritan_Woman.jpg/1280px-Tissot_Jesus_and_the_Samaritan_Woman.jpg',
};

/** Renvoie l'image spécifique à la péricope évangélique, ou une image saisonnière en fallback */
function getGospelImageFromReading(books: string, chapters: string, season: string): string {
  const b = books.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const ch = parseInt(chapters.split(/[,\-]/)[0].trim(), 10);

  let scene: string | null = null;

  // ── Marc ─────────────────────────────────────────────────────────────────────
  if (/marc|mark|mc\.?$|mk/.test(b)) {
    if (ch === 1)  scene = 'baptism';
    else if (ch === 2) scene = 'healing';
    else if (ch === 3) scene = 'calling';
    else if (ch === 4) scene = 'storm';
    else if (ch === 5) scene = 'healing';
    else if (ch === 6) scene = 'multiplication';
    else if (ch === 7) scene = 'healing';
    else if (ch === 8) scene = 'healing';
    else if (ch === 9) scene = 'transfiguration';
    else if (ch === 10) scene = 'bartimaeus'; // Bartimée !
    else if (ch === 11) scene = 'entry_jerusalem';
    else if (ch === 12 || ch === 13) scene = 'sermon';
    else if (ch === 14) scene = 'last_supper';
    else if (ch === 15) scene = 'crucifixion';
    else if (ch === 16) scene = 'resurrection';
  }

  // ── Matthieu ─────────────────────────────────────────────────────────────────
  if (/matthieu|matthew|mt\.?$/.test(b)) {
    if (ch === 1 || ch === 2) scene = 'nativity';
    else if (ch === 3) scene = 'baptism';
    else if (ch === 4) scene = 'temptation';
    else if (ch >= 5 && ch <= 7) scene = 'sermon';
    else if (ch === 8 || ch === 9) scene = 'healing';
    else if (ch === 10 || ch === 11) scene = 'calling';
    else if (ch === 14) scene = 'walking_water';
    else if (ch === 15) scene = 'multiplication';
    else if (ch === 17) scene = 'transfiguration';
    else if (ch === 21) scene = 'entry_jerusalem';
    else if (ch === 26) scene = 'gethsemane';
    else if (ch === 27) scene = 'crucifixion';
    else if (ch === 28) scene = 'resurrection';
  }

  // ── Luc ───────────────────────────────────────────────────────────────────────
  if (/\bluc\b|luke|lc\.?$/.test(b)) {
    if (ch === 1) scene = 'annunciation';
    else if (ch === 2) scene = 'nativity';
    else if (ch === 3) scene = 'baptism';
    else if (ch === 4) scene = 'temptation';
    else if (ch === 5 || ch === 6) scene = 'calling';
    else if (ch === 9) scene = 'transfiguration';
    else if (ch === 10) scene = 'good_samaritan';
    else if (ch === 15) scene = 'prodigal_son';
    else if (ch === 19) scene = 'entry_jerusalem';
    else if (ch === 22) scene = 'last_supper';
    else if (ch === 23) scene = 'crucifixion';
    else if (ch === 24) scene = 'emmaus';
  }

  // ── Jean ─────────────────────────────────────────────────────────────────────
  if (/\bjean\b|john|jn\.?$/.test(b)) {
    if (ch === 1) scene = 'baptism';
    else if (ch === 2) scene = 'wedding_cana';
    else if (ch === 4) scene = 'samaritan_woman';
    else if (ch === 6) scene = 'multiplication';
    else if (ch === 10) scene = 'good_shepherd';
    else if (ch === 11) scene = 'lazarus';
    else if (ch === 12) scene = 'entry_jerusalem';
    else if (ch === 13) scene = 'washing_feet';
    else if (ch === 18 || ch === 19) scene = 'crucifixion';
    else if (ch === 20 || ch === 21) scene = 'resurrection';
  }

  // ── Actes ────────────────────────────────────────────────────────────────────
  if (/actes|acts|ac\.?$/.test(b)) scene = 'pentecost';

  const rawUrl = scene && SCENE[scene] ? SCENE[scene] : seasonalImage(season);
  return `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&w=1920&output=webp&q=85`;
}

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
const RSS_WORLD = 'https://fr.aleteia.org/feed/';
const RSS_BY_COUNTRY: Record<string, string> = {
  CM: 'https://fr.aleteia.org/feed/',
  SN: 'https://fr.aleteia.org/feed/',
  CI: 'https://fr.aleteia.org/feed/',
  FR: 'https://fr.aleteia.org/feed/',
  BE: 'https://www.cathobel.be/feed/',
  US: 'https://www.catholicnewsagency.com/feed',
};

async function fetchRssItems(url: string, count = 3): Promise<{ title: string; description: string; link: string }[]> {
  try {
    const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=${count}`;
    const res = await fetch(api, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
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
  return decodeText(html.replace(/<[^>]*>/g, ' '));
}

function decodeText(value?: string | null): string {
  if (!value) return '';
  const named: Record<string, string> = {
    amp: '&', nbsp: ' ', quot: '"', apos: "'", laquo: '«', raquo: '»', hellip: '…',
    mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
    eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç',
    icirc: 'î', iuml: 'ï', ocirc: 'ô', ugrave: 'ù', ucirc: 'û', Eacute: 'É', Ccedil: 'Ç',
  };
  let text = value;
  for (let i = 0; i < 3; i += 1) {
    const next = text
      .replace(/&#x([0-9a-fA-F]+);?/g, (_, h) => {
        try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; }
      })
      .replace(/&#(\d+);?/g, (_, d) => {
        try { return String.fromCodePoint(parseInt(d, 10)); } catch { return ''; }
      })
      .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, name) => named[name] ?? m);
    if (next === text) break;
    text = next;
  }
  return text.replace(/\s+/g, ' ').trim();
}

// ══════════════════════════════════════════════════════════════════════════════
// Carrousel Actualités
// ══════════════════════════════════════════════════════════════════════════════
// Mapping langue → sources RSS acceptées (permet de filtrer les actus par langue de l'app)
const SOURCES_BY_LANG: Record<string, string[]> = {
  fr: ['Aleteia', 'Cathobel', 'cath.ch', 'Vatican News'],
  en: ['Catholic News Agency'],
  it: ['Vatican News IT', 'ACI Stampa'],
  es: ['Aleteia ES'],
  pt: ['Aleteia PT'],
};

const BadgeIcon = ({ name }: { name: string }) => {
  const cls = 'w-3 h-3 shrink-0';
  if (name === 'calendar') return <CalendarDays className={cls} />;
  if (name === 'globe') return <Globe2 className={cls} />;
  if (name === 'landmark') return <Landmark className={cls} />;
  return <Cross className={cls} />;
};

const HeroNewsCarousel = ({ lang }: { lang: string }) => {
  // Icônes vectorielles (remplacent les emojis, qui ne s'affichent pas sur
  // certains appareils/polices et produisent des carrés vides)
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
      const sources = SOURCES_BY_LANG[lang] ?? SOURCES_BY_LANG.fr;

      // ── 1. Activités à venir ─────────────────────────────────────────────────
      const today = new Date().toISOString().split('T')[0];
      try {
        const { data: acts } = await (supabase as any)
          .from('activities')
          .select('id, title, date, description')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(2);
        for (const a of (acts || [])) {
          all.push({
            key: `activity-${a.id}`,
            type: 'platform',
            badge: 'Activité à venir',
            badgeIcon: 'calendar',
            title: a.title,
            excerpt: a.description ? stripHtml(a.description).slice(0, 140) : undefined,
            href: '/activities',
            isExternal: false,
          });
        }
      } catch {}

      // ── 3. Actualités association (Supabase, asso/event/announcement en premier) ─
      try {
        const { data: posts } = await (supabase as any)
          .from('news_posts')
          .select('id, title, excerpt, category, external_url')
          .eq('is_published', true)
          .in('category', ['association', 'event', 'announcement'])
          .order('published_at', { ascending: false })
          .limit(4);
        for (const p of (posts || [])) {
          all.push({
            key: `platform-${p.id}`,
            type: 'platform',
            badge: p.category === 'event' ? 'Événement' : p.category === 'announcement' ? 'Annonce' : 'Association',
            badgeIcon: p.category === 'event' ? 'calendar' : 'landmark',
            title: p.title,
            excerpt: p.excerpt || undefined,
            href: p.external_url || `/actualites/${p.id}`,
            isExternal: !!p.external_url,
          });
        }
      } catch {}

      setItems([...all]);
      if (all.length > 0) setLoading(false);

      // ── 4. Actualités monde catholique ───────────────────────────────────────
      try {
        const { data: worldRows } = await (supabase as any)
          .from('rss_articles')
          .select('id,title,excerpt,external_url')
          .eq('is_broken', false)
          .in('source', sources)
          .order('published_at', { ascending: false })
          .limit(5);
        for (const w of (worldRows || [])) {
          all.push({
            key: `world-${w.id}`,
            type: 'world',
            badge: 'Monde catholique',
            badgeIcon: 'globe',
            title: decodeText(w.title),
            excerpt: decodeText(w.excerpt).slice(0, 140) || undefined,
            href: w.external_url,
            isExternal: true,
          });
        }
      } catch {}

      // Note : filtrage par langue de l'application (pas par pays).
      // Un utilisateur au Cameroun avec l'app en français voit les actus francophones.

      // Fallback si vraiment rien
      if (all.length === 0) {
        all.push({
          key: 'fallback',
          type: 'platform',
          badge: 'Voie Vérité Vie',
          badgeIcon: 'cross',
          title: 'Bienvenue dans la communauté Voie Vérité Vie',
          excerpt: 'Rejoignez-nous pour vivre la foi ensemble : prière, lecture biblique, appels & lives, témoignages…',
          href: '/about',
          isExternal: false,
        });
      }

      // Limiter à 10 éléments
      setItems(all.slice(0, 10));
      setLoading(false);
    };

    void load();
  }, [lang]);

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
        style={{ borderColor: lit.colorHex + '45', backgroundColor: 'rgba(10,16,30,0.82)' }}
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
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                style={{ color: lit.colorHex, borderColor: lit.colorHex + '60', backgroundColor: lit.colorHex + '18' }}
              >
                <BadgeIcon name={item.badgeIcon} />
                {item.badge}
              </span>
              <span className="text-white/45 text-[10px]">
                {current + 1}/{items.length}
              </span>
            </div>

            {/* Titre */}
            <h2 className="text-white font-cinzel font-bold text-lg sm:text-2xl leading-snug line-clamp-2 mb-2">
              {item.title}
            </h2>

            {/* Extrait */}
            {item.excerpt && (
              <p className="text-white/75 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-3">
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

// ── Bandeau défilant d'actualités (marquee) ──
const NewsTicker = ({ lang }: { lang: string }) => {
  const [headlines, setHeadlines] = useState<{ id: string; title: string; url: string; source: string }[]>([]);

  useEffect(() => {
    const sources = SOURCES_BY_LANG[lang] ?? SOURCES_BY_LANG.fr;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('rss_articles')
          .select('id,title,external_url,source')
          .eq('is_broken', false)
          .in('source', sources)
          .order('published_at', { ascending: false })
          .limit(12);
        setHeadlines((data || []).map((r: any) => ({
          id: r.id, title: decodeText(r.title), url: r.external_url, source: r.source,
        })));
      } catch {}
    })();
  }, [lang]);

  if (headlines.length === 0) return null;
  // Duplique la liste pour un défilement infini fluide
  const loop = [...headlines, ...headlines];

  return (
    <div
      className="w-full overflow-hidden border-y backdrop-blur-md"
      style={{ borderColor: lit.colorHex + '33', backgroundColor: 'rgba(10,16,30,0.55)' }}
      aria-label="Actualités catholiques défilantes"
    >
      <div className="flex items-center">
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
          style={{ backgroundColor: lit.colorHex }}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">À la une</span>
          <span className="sm:hidden">Live</span>
        </div>
        <div className="relative flex-1 overflow-hidden py-2">
          <div className="flex whitespace-nowrap animate-marquee-x">
            {loop.map((h, i) => (
              <a
                key={`${h.id}-${i}`}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 text-xs sm:text-sm text-white/85 hover:text-white transition-colors"
              >
                <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: lit.colorHex }} />
                <span className="opacity-60">{h.source}</span>
                <span>—</span>
                <span className="font-medium">{h.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'fr').split('-')[0];
  const { user } = useAuth();

  const [currentVerse, setCurrentVerse] = useState(0);
  const [verses, setVerses]             = useState<DisplayVerse[]>(FALLBACK_VERSES);
  const [todayReading, setTodayReading] = useState<TodayReading | null>(null);
  const [todayFeast, setTodayFeast]     = useState<{ name: string; message: string; color: string } | null>(null);
  // Image de fond : image saisonnière par défaut, remplacée par la scène de l'évangile du jour
  const [bgImage, setBgImage] = useState(() =>
    `https://wsrv.nl/?url=${encodeURIComponent(seasonalImage(lit.season))}&w=1920&output=webp&q=85`
  );

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
      // Mise à jour de l'image de fond avec la scène évangélique du jour
      setBgImage(getGospelImageFromReading(data.books, data.chapters, lit.season));
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
    <section className="relative min-h-[560px] sm:min-h-[620px] max-h-[860px] h-[88svh] flex items-center justify-center overflow-hidden">

      {/* Arrière-plan — image quotidienne liée à l'Évangile */}
      <div className="absolute inset-0 z-0 bg-[hsl(220,55%,6%)]">
        {/* Image de secours (locale) — toujours visible en arrière-plan */}
        <img
          src={heroCathedral} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        {/* Image quotidienne (scène évangélique) — s'affiche quand chargée */}
        <motion.img
          key={bgImage}
          src={bgImage} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 2, ease: 'easeIn' }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(10,16,30,0.80)] via-[rgba(10,16,30,0.55)] to-[rgba(10,16,30,0.90)]" />
        {/* Halo couleur liturgique */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ backgroundColor: lit.colorHex + '18' }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Bande liturgique (top) */}
      <div className="absolute top-0 left-0 right-0 z-20 h-[3px]" style={{ backgroundColor: lit.colorHex }} />

      {/* Bandeau défilant d'actualités (marquee) — juste sous la navbar */}
      <div className="absolute top-[64px] sm:top-[72px] left-0 right-0 z-20">
        <NewsTicker lang={lang} />
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-6 pt-32 sm:pt-36 pb-12">

        {/* ── Badge saison liturgique ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <span
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium"
            style={{ borderColor: lit.colorHex + '70', color: lit.colorHex, backgroundColor: lit.colorHex + '18' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lit.colorHex }} />
            {lit.season} — {lit.colorLabel}
          </span>
        </motion.div>

        {/* ══ 1. CARROUSEL ACTUALITÉS ══ */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <HeroNewsCarousel lang={lang} />
        </motion.div>

        {/* ── Petits indicateurs communauté (embellissement) ── */}
        <motion.div
          className="w-full max-w-xl grid grid-cols-3 gap-2 sm:gap-3"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          {[
            { icon: <BookOpen className="w-4 h-4" />, label: t('hero.stats.reading', { defaultValue: 'Lecture du jour' }) },
            { icon: <Sparkles className="w-4 h-4" />, label: lit.season },
            { icon: <Heart className="w-4 h-4" />, label: t('hero.stats.community', { defaultValue: 'Communauté 3V' }) },
          ].map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-2 rounded-xl border backdrop-blur-md px-2.5 py-2.5"
              style={{ borderColor: lit.colorHex + '30', backgroundColor: 'rgba(12,18,34,0.72)' }}
            >
              <span className="shrink-0" style={{ color: lit.colorHex }}>{s.icon}</span>
              <span className="text-[11px] sm:text-xs text-white/90 font-medium truncate">{s.label}</span>
            </div>
          ))}
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
