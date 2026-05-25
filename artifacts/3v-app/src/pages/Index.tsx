import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import MissionSection from '@/components/MissionSection';
import { ActivitiesSection, CTASection } from '@/components/HomeSections';
import VersetDuJour from '@/components/VersetDuJour';
import PostSignupCommunityModal from '@/components/PostSignupCommunityModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallSession } from '@/contexts/CallSessionContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone, Video, Mic, Radio, Calendar, ChevronRight, Heart, MessageCircle,
  Sparkles, Clock, BookOpen, TrendingUp,
} from 'lucide-react';
import { format, differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const db = supabase as any;

// ── Types ──────────────────────────────────────────────────────────────────────

interface ActiveRoom {
  id: string;
  title: string;
  room_type: string;
  status: string;
}

interface NewsItem {
  id: string;
  type: 'session' | 'testimony' | 'forum' | 'live';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  date: string;
  href: string;
  emoji?: string;
  urgent?: boolean;
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
      const { data } = await db
        .from('video_rooms')
        .select('id, title, room_type, status')
        .in('status', ['waiting', 'live'])
        .order('created_at', { ascending: false })
        .limit(3);
      setActiveRooms((data || []) as ActiveRoom[]);
    };
    void load();
    const channel = db
      .channel('home-active-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_rooms' }, () => void load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  if (!user || activeRooms.length === 0) return null;

  return (
    <motion.div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25 }}
    >
      <div className="rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold text-foreground">{t('activeCall.callInProgress')}</span>
        </div>
        {activeRooms.map((room) => (
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

// ── Actualités Section ─────────────────────────────────────────────────────────

const ActualitesSection = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sessionsRes, testimoniesRes, forumRes] = await Promise.allSettled([
          db.from('scheduled_sessions').select('id,title,session_type,scheduled_date,scheduled_time,status').in('status', ['scheduled', 'live']).order('scheduled_date', { ascending: true }).limit(4),
          db.from('testimonials').select('id,title,author_name,created_at').eq('approved', true).order('created_at', { ascending: false }).limit(3),
          db.from('forum_threads').select('id,title,created_at,prayer_count').order('created_at', { ascending: false }).limit(3),
        ]);

        const newItems: NewsItem[] = [];

        // Live sessions (urgent, shown first)
        if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data) {
          for (const s of sessionsRes.value.data as any[]) {
            const isLive = s.status === 'live';
            const dt = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
            const mins = differenceInMinutes(dt, new Date());
            const soon = mins > 0 && mins <= 60;
            newItems.push({
              id: s.id,
              type: isLive ? 'live' : 'session',
              title: s.title,
              subtitle: isLive ? 'En direct maintenant' : soon ? `Dans ${mins} min` : format(dt, 'PPp', { locale: fr }),
              badge: isLive ? 'LIVE' : soon ? 'Bientôt' : s.session_type === 'audio' ? '🎙️' : s.session_type === 'live' ? '📡' : '📹',
              badgeColor: isLive ? 'bg-red-500' : soon ? 'bg-amber-500' : 'bg-muted',
              date: s.scheduled_date,
              href: '/calls-lives',
              emoji: isLive ? '🔴' : '📅',
              urgent: isLive || soon,
            });
          }
        }

        // Recent testimonials
        if (testimoniesRes.status === 'fulfilled' && testimoniesRes.value.data) {
          for (const t of testimoniesRes.value.data as any[]) {
            newItems.push({
              id: t.id,
              type: 'testimony',
              title: t.title,
              subtitle: t.author_name ? `Par ${t.author_name}` : undefined,
              badge: '🕊️',
              badgeColor: 'bg-muted',
              date: t.created_at,
              href: '/temoignages',
              emoji: '🕊️',
            });
          }
        }

        // Recent forum posts
        if (forumRes.status === 'fulfilled' && forumRes.value.data) {
          for (const f of forumRes.value.data as any[]) {
            newItems.push({
              id: f.id,
              type: 'forum',
              title: f.title,
              subtitle: f.prayer_count ? `${f.prayer_count} prières` : 'Intention de prière',
              badge: '🙏',
              badgeColor: 'bg-muted',
              date: f.created_at,
              href: '/prayer-forum',
              emoji: '🙏',
            });
          }
        }

        // Sort: urgent first, then by date
        newItems.sort((a, b) => {
          if (a.urgent && !b.urgent) return -1;
          if (!a.urgent && b.urgent) return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setItems(newItems);
      } catch {
        // Silent fail — section just won't show
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, []);

  // Ticker rotation
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setTickerIdx(i => (i + 1) % items.length), 4000);
    return () => clearInterval(id);
  }, [items.length]);

  if (loading || items.length === 0) return null;

  const tickerItem = items[tickerIdx];

  return (
    <section className="py-8 bg-background border-y border-border/40">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground font-cinzel tracking-wide">Actualités</h2>
          </div>
          <Link to="/calls-lives" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
            Tout voir <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Animated ticker bar */}
        <div className="mb-5 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Flash</span>
            </div>
            <div className="h-3.5 w-px bg-border" />
            <AnimatePresence mode="wait">
              <motion.div
                key={tickerIdx}
                className="flex items-center gap-2 min-w-0"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-base shrink-0">{tickerItem.emoji}</span>
                <Link to={tickerItem.href} className="text-xs text-foreground hover:text-primary transition-colors truncate">
                  {tickerItem.urgent && (
                    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 text-white", tickerItem.badgeColor)}>
                      {tickerItem.badge}
                    </span>
                  )}
                  {tickerItem.title}
                </Link>
              </motion.div>
            </AnimatePresence>
            <div className="ml-auto flex gap-1 shrink-0">
              {items.map((_, i) => (
                <button key={i} onClick={() => setTickerIdx(i)} className={cn("h-1.5 rounded-full transition-all", i === tickerIdx ? "w-4 bg-primary" : "w-1.5 bg-border hover:bg-primary/40")} />
              ))}
            </div>
          </div>
        </div>

        {/* News cards — horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              className="min-w-[220px] max-w-[240px] snap-center shrink-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={item.href}>
                <div className={cn(
                  "group h-full rounded-2xl border p-4 flex flex-col gap-2.5 hover:border-primary/40 hover:shadow-[0_4px_20px_-5px_hsl(var(--primary)/0.15)] transition-all cursor-pointer",
                  item.urgent ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-card"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{item.emoji}</span>
                    {item.badge && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0",
                        item.badgeColor
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-[10px] text-muted-foreground mt-1">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: fr })}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* CTA card */}
          <motion.div
            className="min-w-[180px] snap-center shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: items.length * 0.05 }}
          >
            <Link to="/calls-lives">
              <div className="h-full rounded-2xl border border-dashed border-cathedral-gold/30 bg-cathedral-gold/5 p-4 flex flex-col items-center justify-center gap-3 hover:bg-cathedral-gold/10 transition-colors cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-cathedral-gold/15 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-cathedral-gold" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-cathedral-gold">Rejoindre un live</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Prier ensemble</p>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Quick stat bar */}
        <div className="mt-5 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          {[
            { icon: <BookOpen className="h-3.5 w-3.5" />, label: 'Lectures du jour', href: '/messe-office' },
            { icon: <Heart className="h-3.5 w-3.5" />, label: 'Forum prière', href: '/prayer-forum' },
            { icon: <MessageCircle className="h-3.5 w-3.5" />, label: 'Témoignages', href: '/temoignages' },
            { icon: <Clock className="h-3.5 w-3.5" />, label: 'Activités', href: '/activities' },
          ].map(({ icon, label, href }) => (
            <Link key={label} to={href} className="flex items-center gap-1.5 hover:text-primary transition-colors group">
              <span className="group-hover:scale-110 transition-transform">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

const Index = () => {
  const [postSignupOpen, setPostSignupOpen] = useState(false);
  const [postSignupName, setPostSignupName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const shouldOpen = localStorage.getItem('post_signup_community_v1') === '1';
      const name = localStorage.getItem('post_signup_name_v1');
      if (shouldOpen) {
        setPostSignupName(name);
        setPostSignupOpen(true);
      }
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
        <VersetDuJour />
        {/* Actualités feed — shows upcoming sessions, testimonials, forum activity */}
        <ActualitesSection />
        <MissionSection />
        <ActivitiesSection />
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
