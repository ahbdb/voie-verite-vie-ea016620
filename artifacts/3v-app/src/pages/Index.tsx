import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import MissionSection from '@/components/MissionSection';
import { CTASection } from '@/components/HomeSections';
import VersetDuJour from '@/components/VersetDuJour';
import NewsMagazine from '@/components/NewsMagazine';
import { useArticles } from '@/hooks/useArticles';
import PostSignupCommunityModal from '@/components/PostSignupCommunityModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallSession } from '@/contexts/CallSessionContext';
import { Button } from '@/components/ui/button';
import {
  Phone, Video, Mic, Radio, ChevronRight, Heart, MessageCircle,
  Clock, BookOpen, Newspaper, Plus, Play,
  ExternalLink, Image as ImageIcon, Share2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const db = supabase as any;

// ── Types ──────────────────────────────────────────────────────────────────────

interface ActiveRoom {
  id: string; title: string; room_type: string; status: string;
}

interface NewsPost {
  id: string; title: string; excerpt: string | null; content?: string | null;
  image_url: string | null; video_url: string | null; category: string;
  author_name: string | null; featured: boolean; published_at: string; external_url: string | null;
}

interface RssItem {
  title: string; description: string; link: string; pubDate: string;
  thumbnail: string; enclosure?: { link: string; type: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// RSS sources indexed by ISO country code (fallback: Aleteia FR)
const RSS_WORLD = 'https://fr.aleteia.org/feed/';
const RSS_BY_COUNTRY: Record<string, string> = {
  FR: 'https://fr.aleteia.org/feed/',
  BE: 'https://www.cathobel.be/feed/',
  CH: 'https://www.kath.ch/feed/',
  IT: 'https://it.aleteia.org/feed/',
  DE: 'https://de.aleteia.org/feed/',
  ES: 'https://es.aleteia.org/feed/',
  PT: 'https://pt.aleteia.org/feed/',
  US: 'https://www.catholicnewsagency.com/feed',
  GB: 'https://catholicherald.co.uk/feed/',
  PL: 'https://pl.aleteia.org/feed/',
  // Afrique francophone → Agence I.MEDIA (actualités catholiques)
  CM: 'https://www.imedias.eu/feed/',
  SN: 'https://www.imedias.eu/feed/',
  CI: 'https://www.imedias.eu/feed/',
  TG: 'https://www.imedias.eu/feed/',
  BJ: 'https://www.imedias.eu/feed/',
  CD: 'https://www.imedias.eu/feed/',
  MG: 'https://www.imedias.eu/feed/',
  GA: 'https://www.imedias.eu/feed/',
  CG: 'https://www.imedias.eu/feed/',
  RW: 'https://www.imedias.eu/feed/',
  BI: 'https://www.imedias.eu/feed/',
};

/** Convertit un nom de pays (stocké en profil) en code ISO-2. */
function countryNameToCode(name: string): string {
  const MAP: Record<string, string> = {
    'cameroun': 'CM', 'cameroon': 'CM',
    'france': 'FR', 'belgique': 'BE', 'belgium': 'BE',
    'suisse': 'CH', 'switzerland': 'CH',
    'italie': 'IT', 'italy': 'IT',
    'allemagne': 'DE', 'germany': 'DE',
    'espagne': 'ES', 'spain': 'ES',
    'portugal': 'PT',
    'états-unis': 'US', 'usa': 'US', 'etats-unis': 'US',
    'royaume-uni': 'GB', 'uk': 'GB',
    'pologne': 'PL', 'poland': 'PL',
    'sénégal': 'SN', 'senegal': 'SN',
    "côte d'ivoire": 'CI', 'ivory coast': 'CI',
    'togo': 'TG', 'bénin': 'BJ', 'benin': 'BJ',
    'congo': 'CG', 'rdc': 'CD', 'congo-kinshasa': 'CD',
    'gabon': 'GA', 'madagascar': 'MG',
    'rwanda': 'RW', 'burundi': 'BI',
  };
  return MAP[name.trim().toLowerCase()] ?? '';
}

async function fetchRss(url: string, count = 6): Promise<RssItem[]> {
  try {
    const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=${count}`;
    const res = await fetch(api, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.status === 'ok' ? (data.items as RssItem[]) : [];
  } catch { return []; }
}

async function detectCountry(): Promise<{ code: string; name: string; city: string }> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const d = await res.json();
    return { code: d.country_code || 'FR', name: d.country_name || 'France', city: d.city || '' };
  } catch { return { code: 'FR', name: 'France', city: '' }; }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

/** Proxy les images externes via wsrv.nl (hotlink + &amp; fix). */
function proxyImg(url: string | null): string | null {
  if (!url) return null;
  const clean = url.replace(/&amp;/g, '&');
  if (clean.includes('supabase') || clean.includes('localhost')) return clean;
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=600&output=webp&q=80`;
}

function rssThumb(item: RssItem) {
  return item.thumbnail || item.enclosure?.link || null;
}

/** Temps de lecture estimé en minutes */
function readingTime(text: string | null | undefined): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}

/** Vrai si publié il y a moins de 24h */
function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < 86_400_000;
}

/** Partage natif ou copie dans le presse-papier */
async function sharePost(post: NewsPost) {
  const url = post.external_url || `${window.location.origin}/actualites/${post.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: post.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié !');
    }
  } catch { /* annulé par l'utilisateur */ }
}

// ── Active call banner ─────────────────────────────────────────────────────────

const ActiveCallBanner = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { primeAudioPlayback } = useCallSession();
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await db.from('video_rooms').select('id,title,room_type,status')
        .in('status', ['waiting', 'live']).order('created_at', { ascending: false }).limit(3);
      setActiveRooms((data || []) as ActiveRoom[]);
    };
    void load();
    const ch = db.channel('home-active-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_rooms' }, () => void load())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user]);

  if (!user || activeRooms.length === 0) return null;

  return (
    <motion.div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
      initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25 }}>
      <div className="rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold text-foreground">{t('activeCall.callInProgress')}</span>
        </div>
        {activeRooms.map(room => (
          <div key={room.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              {room.room_type === 'audio' ? <Mic className="h-4 w-4 text-primary" /> : <Video className="h-4 w-4 text-primary" />}
              <span className="text-sm font-medium text-foreground truncate max-w-[180px]">{room.title}</span>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => { primeAudioPlayback(); navigate(`/meeting/${room.id}`); }}>
              <Phone className="h-3.5 w-3.5 mr-1" /> {t('activeCall.join')}
            </Button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── News (DB + RSS fusionnés) ──────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, string> = {
  association: '🏛️ Association',
  event: '📅 Événement',
  announcement: '📢 Annonce',
  church: '⛪ Église',
};

/** Convertit un RssItem en NewsPost pour l'afficher dans NewsCard */
function rssItemToPost(item: RssItem, sourceName: string): NewsPost {
  return {
    id: item.link,
    title: item.title,
    excerpt: stripHtml(item.description || '').slice(0, 220) || null,
    image_url: rssThumb(item) || null,
    video_url: null,
    category: 'church',
    author_name: sourceName,
    featured: false,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    external_url: item.link,
  };
}

const CATEGORY_TABS = [
  { value: 'all',          label: 'Tout' },
  { value: 'association',  label: '🏛️ Association' },
  { value: 'event',        label: '📅 Événements' },
  { value: 'announcement', label: '📢 Annonces' },
  { value: 'church',       label: '⛪ Église' },
];

const AssociationNewsSection = ({ isAdmin }: { isAdmin: boolean }) => {
  const [dbPosts, setDbPosts]       = useState<NewsPost[]>([]);
  const [rssPosts, setRssPosts]     = useState<NewsPost[]>([]);
  const [loadingDb, setLoadingDb]   = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeIdx, setActiveIdx]   = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  // ── 1. Articles DB ─────────────────────────────────────────────────────────
  const loadDb = useCallback(() => {
    db.from('news_posts')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(30)
      .then(({ data }: any) => { setDbPosts(data || []); setLoadingDb(false); })
      .catch(() => setLoadingDb(false));
  }, []);

  useEffect(() => { loadDb(); }, [loadDb]);

  // Auto-refresh toutes les 30 min
  useEffect(() => {
    const id = setInterval(loadDb, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadDb]);

  // ── 2. RSS catholiques ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchRss(RSS_WORLD, 5).then(items => ({ items, name: 'Aleteia' })),
      fetchRss('https://www.imedias.eu/feed/', 5).then(items => ({ items, name: 'iMédia Afrique' })),
      fetchRss('https://www.famillechretienne.fr/feed/', 5).then(items => ({ items, name: 'Famille Chrétienne' })),
    ]).then(results => {
      if (cancelled) return;
      const posts: NewsPost[] = [];
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const item of r.value.items) {
          if (item.link) posts.push(rssItemToPost(item, r.value.name));
        }
      }
      setRssPosts(posts);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── Fusion + tri ──────────────────────────────────────────────────────────
  const allPosts = React.useMemo(() => {
    const knownLinks = new Set(dbPosts.map(p => p.external_url ?? p.id).filter(Boolean));
    const all = [...dbPosts, ...rssPosts.filter(p => p.external_url && !knownLinks.has(p.external_url))];
    return all.sort((a, b) => (a.category === 'church' ? 1 : 0) - (b.category === 'church' ? 1 : 0));
  }, [dbPosts, rssPosts]);

  // ── Filtre par catégorie ──────────────────────────────────────────────────
  const filteredPosts = React.useMemo(
    () => activeCategory === 'all' ? allPosts : allPosts.filter(p => p.category === activeCategory),
    [allPosts, activeCategory],
  );

  // ── Tabs visibles (seulement ceux avec du contenu) ────────────────────────
  const visibleTabs = React.useMemo(() => {
    const cats = new Set(allPosts.map(p => p.category));
    return CATEGORY_TABS.filter(t => t.value === 'all' || cats.has(t.value));
  }, [allPosts]);

  // Contenu doublé → boucle infinie
  const loopPosts = React.useMemo(
    () => (filteredPosts.length > 0 ? [...filteredPosts, ...filteredPosts] : []),
    [filteredPosts],
  );

  // Reset scroll quand le filtre change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    setActiveIdx(0);
  }, [activeCategory]);

  // ── Auto-scroll infini ────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || filteredPosts.length === 0) return;
    let rafId: number;
    const tick = () => {
      if (!pausedRef.current && el) {
        el.scrollLeft += 0.5;
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [filteredPosts.length]);

  const dotsCount = Math.min(filteredPosts.length, 8);

  return (
    <section className="py-10 bg-background border-y border-border/40">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeader
          icon={<Newspaper className="h-4 w-4" />}
          title="Actualités"
          href="/admin/news"
          linkLabel={isAdmin ? 'Gérer' : undefined}
        />

        {/* ── Filtres catégorie ── */}
        {!loadingDb && allPosts.length > 0 && visibleTabs.length > 2 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {visibleTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveCategory(tab.value)}
                className={cn(
                  'shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 font-medium',
                  activeCategory === tab.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {loadingDb ? (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-muted/30 animate-pulse h-64 shrink-0 w-[280px] sm:w-[300px]" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          isAdmin && allPosts.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
              <Newspaper className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Aucune actualité disponible.</p>
              <Button asChild size="sm" className="rounded-xl">
                <Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1.5" /> Créer la première</Link>
              </Button>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground text-center py-8">Aucun article dans cette catégorie.</p>
          )
        ) : (
          <>
            <div className="relative mt-4">

              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide"
                style={{ scrollBehavior: 'auto' }}
                onMouseEnter={() => { pausedRef.current = true; }}
                onMouseLeave={() => { pausedRef.current = false; }}
                onTouchStart={() => { pausedRef.current = true; }}
                onTouchEnd={() => { setTimeout(() => { pausedRef.current = false; }, 2500); }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const cardW = 316;
                  const normalizedScroll = el.scrollLeft % (el.scrollWidth / 2);
                  setActiveIdx(Math.round(normalizedScroll / cardW) % filteredPosts.length);
                }}
              >
                {loopPosts.map((post, i) => (
                  <motion.div
                    key={`${post.id}-${i}`}
                    className="shrink-0 w-[280px] sm:w-[300px]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 5) * 0.05, duration: 0.4 }}
                  >
                    <NewsCard post={post} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Indicateur de progression (dots) ── */}
            {dotsCount > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-3">
                {Array.from({ length: dotsCount }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ width: i === (activeIdx % dotsCount) ? '1.5rem' : '0.375rem' }}
                    transition={{ duration: 0.3 }}
                    className="h-1.5 rounded-full"
                    style={{
                      backgroundColor: i === (activeIdx % dotsCount)
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--border))',
                    }}
                  />
                ))}
                {filteredPosts.length > 8 && (
                  <span className="text-[10px] text-muted-foreground/50 ml-1">+{filteredPosts.length - 8}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

const NewsCard = ({ post }: { post: NewsPost }) => {
  const isExternal = !!post.external_url;
  const href = post.external_url || `/actualites/${post.id}`;
  const _isNew = isNew(post.published_at);
  const mins = readingTime((post.content || post.excerpt) ?? null);
  const [imgError, setImgError] = useState(false);

  // Quand l'image échoue OU qu'il n'y a pas d'image → afficher le titre sur fond
  const showFallback = !post.image_url || imgError;

  // Badges partagés
  const badges = (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white uppercase tracking-wide shadow-sm">
        {CATEGORY_BADGE[post.category] ?? '📰 Actualité'}
      </span>
      {_isNew && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white uppercase tracking-wide animate-pulse">
          Nouveau
        </span>
      )}
    </div>
  );

  const inner = (
    <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25)] transition-all duration-300 h-full flex flex-col">

      {/* ── Media ── */}
      {post.video_url && !showFallback ? (
        <div className="relative w-full aspect-video bg-zinc-900 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Play className="h-5 w-5 text-white ml-0.5" />
          </div>
          <div className="absolute top-2 left-2">{badges}</div>
        </div>
      ) : !showFallback ? (
        /* Image OK */
        <div className="relative overflow-hidden w-full bg-muted/10">
          <img
            src={proxyImg(post.image_url)!}
            alt={post.title}
            className="w-full h-auto block group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute top-2 left-2 z-10">{badges}</div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); void sharePost(post); }}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            title="Partager"
          >
            <Share2 className="h-3 w-3 text-white" />
          </button>
        </div>
      ) : (
        /* Fallback : pas d'image / image cassée → titre sur fond dégradé */
        <div className="relative w-full flex flex-col justify-between p-4 overflow-hidden"
          style={{
            minHeight: '160px',
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.22) 0%, hsl(var(--primary)/0.10) 50%, hsl(var(--muted)/0.35) 100%)',
          }}>
          {/* Halo décoratif */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.12] -translate-y-8 translate-x-8"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
          <div className="relative z-10">{badges}</div>
          <p className="relative z-10 font-cinzel font-bold text-foreground text-sm leading-snug line-clamp-3 mt-auto pt-3">
            {post.title}
          </p>
        </div>
      )}

      {/* Texte */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-cinzel font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
              {post.excerpt}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 min-w-0">
            <span className="truncate">
              {formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: fr })}
              {post.author_name && ` · ${post.author_name}`}
            </span>
            {mins > 0 && (
              <span className="shrink-0 flex items-center gap-0.5 text-muted-foreground/40">
                <Clock className="h-2.5 w-2.5" />{mins} min
              </span>
            )}
          </div>
          <motion.div whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400 }} className="shrink-0 ml-2">
            {isExternal
              ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
          </motion.div>
        </div>
      </div>
    </div>
  );

  if (isExternal) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>;
  }
  return <Link to={href} className="block h-full">{inner}</Link>;
};


// ── Quick links bar ────────────────────────────────────────────────────────────

const QuickLinksBar = () => (
  <div className="py-4 border-b border-border/40 bg-muted/20">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap text-xs text-muted-foreground">
        {[
          { icon: <BookOpen className="h-3.5 w-3.5" />, label: 'Lectures du jour', href: '/messe-office' },
          { icon: <Heart className="h-3.5 w-3.5" />, label: 'Forum prière', href: '/prayer-forum' },
          { icon: <MessageCircle className="h-3.5 w-3.5" />, label: 'Témoignages', href: '/temoignages' },
          { icon: <Radio className="h-3.5 w-3.5" />, label: 'Appels & Lives', href: '/calls-lives' },
          { icon: <Clock className="h-3.5 w-3.5" />, label: 'Activités', href: '/activities' },
        ].map(({ icon, label, href }) => (
          <Link key={label} to={href} className="flex items-center gap-1.5 hover:text-primary transition-colors group">
            <span className="group-hover:scale-110 transition-transform">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

// ── Shared: Section header ─────────────────────────────────────────────────────

const SectionHeader = ({ icon, title, subtitle, href, linkLabel, external }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  href?: string; linkLabel?: string; external?: boolean;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        <h2 className="text-sm font-bold text-foreground font-cinzel tracking-wide">{title}</h2>
      </div>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1 ml-9">{subtitle}</p>}
    </div>
    {href && linkLabel && (
      external
        ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium shrink-0 mt-1">
            {linkLabel} <ExternalLink className="h-3 w-3" />
          </a>
        )
        : (
          <Link to={href}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium shrink-0 mt-1">
            {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )
    )}
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────────

const NewsMagazineWrapper = ({ isAdmin }: { isAdmin: boolean }) => {
  const { movement, universal, local, loading, userCountry } = useArticles(30);
  return (
    <NewsMagazine
      movement={movement} universal={universal} local={local}
      loading={loading} isAdmin={isAdmin} userCountry={userCountry}
    />
  );
};

const Index = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [postSignupOpen, setPostSignupOpen] = useState(false);
  const [postSignupName, setPostSignupName] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    db.from('user_roles').select('role').eq('user_id', user.id).then(({ data }: any) => {
      setIsAdmin((data || []).some((r: any) => ['admin', 'admin_principal', 'superadmin'].includes(r.role)));
    });
  }, [user]);

  useEffect(() => {
    try {
      const shouldOpen = localStorage.getItem('post_signup_community_v1') === '1';
      const name = localStorage.getItem('post_signup_name_v1');
      if (shouldOpen) { setPostSignupName(name); setPostSignupOpen(true); }
    } catch {}
  }, []);

  const handlePostSignupOpenChange = (open: boolean) => {
    setPostSignupOpen(open);
    if (!open) {
      try {
        localStorage.removeItem('post_signup_community_v1');
        localStorage.removeItem('post_signup_name_v1');
      } catch {}
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <HeroSection />
        <QuickLinksBar />
        <NewsMagazineWrapper isAdmin={isAdmin} />
        <MissionSection />
        <CTASection />
      </main>

      <ActiveCallBanner />

      <PostSignupCommunityModal
        open={postSignupOpen}
        onOpenChange={handlePostSignupOpenChange}
        fullName={postSignupName}
      />
    </div>
  );
};

export default Index;
