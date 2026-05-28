import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import MissionSection from '@/components/MissionSection';
import { CTASection } from '@/components/HomeSections';
import VersetDuJour from '@/components/VersetDuJour';
import PostSignupCommunityModal from '@/components/PostSignupCommunityModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallSession } from '@/contexts/CallSessionContext';
import { Button } from '@/components/ui/button';
import {
  Phone, Video, Mic, Radio, ChevronRight, Heart, MessageCircle,
  Clock, BookOpen, Newspaper, Plus, Play,
  ExternalLink, Image as ImageIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const db = supabase as any;

// ── Types ──────────────────────────────────────────────────────────────────────

interface ActiveRoom {
  id: string; title: string; room_type: string; status: string;
}

interface NewsPost {
  id: string; title: string; excerpt: string | null; image_url: string | null;
  video_url: string | null; category: string; author_name: string | null;
  featured: boolean; published_at: string; external_url: string | null;
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

const AssociationNewsSection = ({ isAdmin }: { isAdmin: boolean }) => {
  const [dbPosts, setDbPosts]   = useState<NewsPost[]>([]);
  const [rssPosts, setRssPosts] = useState<NewsPost[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const pausedRef  = useRef(false);

  // ── 1. Articles DB ─────────────────────────────────────────────────────────
  useEffect(() => {
    db.from('news_posts')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(30)
      .then(({ data }: any) => {
        setDbPosts(data || []);
        setLoadingDb(false);
      })
      .catch(() => setLoadingDb(false));
  }, []);

  // ── 2. RSS catholiques (s'ajoutent après le chargement DB) ─────────────────
  useEffect(() => {
    let cancelled = false;
    const rssSources = [
      { url: RSS_WORLD,                          name: 'Aleteia' },
      { url: 'https://www.imedias.eu/feed/',     name: 'iMédia Afrique' },
      { url: 'https://www.famillechretienne.fr/feed/', name: 'Famille Chrétienne' },
    ];

    Promise.allSettled(
      rssSources.map(s => fetchRss(s.url, 5).then(items => ({ items, name: s.name })))
    ).then(results => {
      if (cancelled) return;
      const posts: NewsPost[] = [];
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const item of r.value.items) {
          if (!item.link) continue;
          posts.push(rssItemToPost(item, r.value.name));
        }
      }
      setRssPosts(posts);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  // ── Fusion DB + RSS — activités asso en premier, église après ────────────
  const allPosts = React.useMemo(() => {
    const knownLinks = new Set(dbPosts.map(p => p.external_url ?? p.id).filter(Boolean));
    const filtered = rssPosts.filter(p => p.external_url && !knownLinks.has(p.external_url));
    const all = [...dbPosts, ...filtered];
    const priority = (c: string) => c === 'church' ? 1 : 0; // asso/event/announcement = 0, church = 1
    return all.sort((a, b) => priority(a.category) - priority(b.category));
  }, [dbPosts, rssPosts]);

  // ── Auto-scroll fluide (requestAnimationFrame pixel par pixel) ───────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || allPosts.length === 0) return;
    const SPEED = 0.6; // px/frame — doux et continu
    let rafId: number;

    const tick = () => {
      if (!pausedRef.current && el) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= maxScroll - 1) {
          el.scrollLeft = 0;
        } else {
          el.scrollLeft += SPEED;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [allPosts.length]);

  return (
    <section className="py-10 bg-background border-y border-border/40">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeader
          icon={<Newspaper className="h-4 w-4" />}
          title="Actualités"
          href="/admin/news"
          linkLabel={isAdmin ? 'Gérer' : undefined}
        />

        {loadingDb ? (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-muted/30 animate-pulse h-64 shrink-0 w-[280px] sm:w-[320px] snap-start" />
            ))}
          </div>
        ) : allPosts.length === 0 ? (
          isAdmin ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
              <Newspaper className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Aucune actualité disponible.</p>
              <Button asChild size="sm" className="rounded-xl">
                <Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1.5" /> Créer la première</Link>
              </Button>
            </div>
          ) : null
        ) : (
          <div
            ref={scrollRef}
            className="mt-6 flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
            onTouchStart={() => { pausedRef.current = true; }}
            onTouchEnd={() => { setTimeout(() => { pausedRef.current = false; }, 2000); }}
          >
            {allPosts.map((post, i) => (
              <motion.div
                key={post.id}
                className="snap-start shrink-0 w-[280px] sm:w-[320px]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.04 }}
              >
                <NewsCard post={post} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const NewsCard = ({ post }: { post: NewsPost }) => {
  const isExternal = !!post.external_url;
  const href = post.external_url || `/actualites/${post.id}`;

  const inner = (
    <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/30 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.2)] transition-all h-full flex flex-col">

      {/* Image — proxifiée via wsrv.nl pour contourner le hotlink */}
      {post.image_url ? (
        <div className="relative overflow-hidden w-full aspect-video bg-muted/20">
          <img
            src={proxyImg(post.image_url)!}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white uppercase tracking-wide shadow">
              {CATEGORY_BADGE[post.category] ?? '📰 Actualité'}
            </span>
          </div>
        </div>
      ) : post.video_url ? (
        <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
          <Play className="h-10 w-10 text-white/60" />
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white uppercase tracking-wide">
              {CATEGORY_BADGE[post.category] ?? '📰 Actualité'}
            </span>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white uppercase tracking-wide">
              {CATEGORY_BADGE[post.category] ?? '📰 Actualité'}
            </span>
          </div>
        </div>
      )}

      {/* Texte */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-cinzel font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
              {post.excerpt}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground/70">
            {formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: fr })}
            {post.author_name && ` · ${post.author_name}`}
          </span>
          {isExternal
            ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
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
        <AssociationNewsSection isAdmin={isAdmin} />
        <VersetDuJour />
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
