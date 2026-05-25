import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Clock, BookOpen, MapPin, Globe, Newspaper, Plus, Play,
  ExternalLink, Image as ImageIcon, Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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

// RSS sources indexed by ISO country code (fallback: fr Vatican)
const RSS_WORLD = 'https://www.vaticannews.va/fr.rss.xml';
const RSS_BY_COUNTRY: Record<string, string> = {
  FR: 'https://eglise.catholique.fr/feed/',
  BE: 'https://www.cathobel.be/feed/',
  CH: 'https://www.kath.ch/feed/',
  IT: 'https://www.vaticannews.va/it.rss.xml',
  DE: 'https://www.vaticannews.va/de.rss.xml',
  ES: 'https://www.vaticannews.va/es.rss.xml',
  PT: 'https://www.vaticannews.va/pt.rss.xml',
  US: 'https://www.catholicnewsagency.com/feed',
  GB: 'https://catholicherald.co.uk/feed/',
  PL: 'https://www.vaticannews.va/pl.rss.xml',
};

async function fetchRss(url: string, count = 6): Promise<RssItem[]> {
  try {
    const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=${count}`;
    const res = await fetch(api, { signal: AbortSignal.timeout(8000) });
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

// ── Association News ───────────────────────────────────────────────────────────

const AssociationNewsSection = ({ isAdmin }: { isAdmin: boolean }) => {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from('news_posts').select('*').eq('is_published', true)
      .order('published_at', { ascending: false }).limit(7)
      .then(({ data }: any) => { setPosts(data || []); setLoading(false); });
  }, []);

  if (!loading && posts.length === 0) {
    if (!isAdmin) return null;
    return (
      <section className="py-10 bg-background border-y border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <SectionHeader icon={<Newspaper className="h-4 w-4" />} title="Vie de l'Association" href="/admin/news" linkLabel="Gérer" />
          <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
            <Newspaper className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Aucune actualité publiée.</p>
            <Button asChild size="sm" className="rounded-xl"><Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1.5" /> Créer la première</Link></Button>
          </div>
        </div>
      </section>
    );
  }

  const featured = posts.find(p => p.featured) || posts[0];
  const rest = posts.filter(p => p.id !== featured?.id).slice(0, 6);

  return (
    <section className="py-10 bg-background border-y border-border/40">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeader icon={<Newspaper className="h-4 w-4" />} title="Vie de l'Association"
          href="/admin/news" linkLabel={isAdmin ? 'Gérer' : undefined} />

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-52 rounded-2xl bg-muted/30 animate-pulse" />)}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Featured article */}
            {featured && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <NewsCard post={featured} variant="featured" />
              </motion.div>
            )}
            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post, i) => (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <NewsCard post={post} variant="grid" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const NewsCard = ({ post, variant }: { post: NewsPost; variant: 'featured' | 'grid' }) => {
  const isFeatured = variant === 'featured';
  const href = post.external_url || `/actualites/${post.id}`;

  return (
    <Link to={href} target={post.external_url ? '_blank' : undefined} rel={post.external_url ? 'noopener noreferrer' : undefined}>
      <div className={cn(
        'group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/30 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.2)] transition-all',
        isFeatured ? 'flex flex-col sm:flex-row' : ''
      )}>
        {/* Image */}
        <div className={cn('relative overflow-hidden bg-muted', isFeatured ? 'sm:w-2/5 aspect-video sm:aspect-auto' : 'aspect-video')}>
          {post.image_url ? (
            <img src={post.image_url} alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : post.video_url ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <Play className="h-10 w-10 text-white/60" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white uppercase tracking-wide">
              {post.category === 'association' ? '🏛️ Association' :
               post.category === 'event' ? '📅 Événement' :
               post.category === 'announcement' ? '📢 Annonce' : '⛪ Église'}
            </span>
          </div>
        </div>
        {/* Content */}
        <div className={cn('p-4 flex flex-col justify-between', isFeatured ? 'sm:flex-1' : '')}>
          <div>
            <h3 className={cn('font-cinzel font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2', isFeatured ? 'text-lg' : 'text-sm')}>
              {post.title}
            </h3>
            {post.excerpt && (
              <p className={cn('text-muted-foreground mt-1.5 leading-relaxed line-clamp-2', isFeatured ? 'text-sm' : 'text-xs')}>
                {post.excerpt}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground/70">
              {formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: fr })}
              {post.author_name && ` · ${post.author_name}`}
            </span>
            {post.external_url
              ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
          </div>
        </div>
      </div>
    </Link>
  );
};

// ── External Catholic News ─────────────────────────────────────────────────────

const ExternalNewsSection = () => {
  const [country, setCountry] = useState<{ code: string; name: string; city: string } | null>(null);
  const [worldNews, setWorldNews] = useState<RssItem[]>([]);
  const [localNews, setLocalNews] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async () => {
      const geo = await detectCountry();
      setCountry(geo);
      const localUrl = RSS_BY_COUNTRY[geo.code];
      const [world, local] = await Promise.all([
        fetchRss(RSS_WORLD, 5),
        localUrl && localUrl !== RSS_WORLD ? fetchRss(localUrl, 4) : Promise.resolve([]),
      ]);
      setWorldNews(world);
      setLocalNews(local);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <section className="py-10 border-y border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des actualités…
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1,2,3,4].map(i => <div key={i} className="min-w-[200px] h-44 rounded-2xl bg-muted/30 animate-pulse shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (worldNews.length === 0 && localNews.length === 0) return null;

  return (
    <section className="py-10 border-y border-border/40 bg-muted/10">
      <div className="container mx-auto px-4 max-w-5xl space-y-10">

        {/* World Catholic News */}
        {worldNews.length > 0 && (
          <div>
            <SectionHeader icon={<Globe className="h-4 w-4" />} title="Église dans le Monde" href="https://www.vaticannews.va/fr.html" linkLabel="Vatican News" external />
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-4 px-4">
              {worldNews.map((item, i) => (
                <motion.div key={i} className="min-w-[220px] max-w-[240px] snap-center shrink-0"
                  initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <RssCard item={item} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Local Catholic News */}
        {localNews.length > 0 && country && (
          <div>
            <SectionHeader
              icon={<MapPin className="h-4 w-4" />}
              title={`Église en ${country.name}`}
              subtitle={country.city ? `Actualités catholiques locales · ${country.city}` : 'Actualités catholiques locales'}
            />
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-4 px-4">
              {localNews.map((item, i) => (
                <motion.div key={i} className="min-w-[220px] max-w-[240px] snap-center shrink-0"
                  initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <RssCard item={item} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const RssCard = ({ item }: { item: RssItem }) => {
  const thumb = rssThumb(item);
  const excerpt = stripHtml(item.description || '').slice(0, 100);

  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block h-full">
      <div className="group h-full rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/30 hover:shadow-[0_4px_20px_-5px_hsl(var(--primary)/0.15)] transition-all cursor-pointer">
        <div className="aspect-video relative overflow-hidden bg-muted">
          {thumb ? (
            <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Globe className="h-8 w-8 text-muted-foreground/20" />
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </p>
          {excerpt && <p className="text-[10px] text-muted-foreground line-clamp-2">{excerpt}</p>}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground/60">
              {item.pubDate ? formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: fr }) : ''}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </a>
  );
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
      <a href={external ? href : undefined}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...(!external ? { as: Link, href: undefined } : {})}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium shrink-0 mt-1"
      >
        {external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
            {linkLabel} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <Link to={href} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
            {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </a>
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
      setIsAdmin((data || []).some((r: any) => r.role === 'admin' || r.role === 'superadmin'));
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
        <ExternalNewsSection />
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
