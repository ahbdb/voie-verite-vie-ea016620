import { useEffect, useState, useMemo, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, isToday, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { fr, enUS, it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { sendCallJoinNotification } from '@/lib/notification-service';
import { useCallSession } from '@/contexts/CallSessionContext';

/** Returns a clean share URL without URLSearchParams encoding artifacts (+, %3A…). */
const buildShareUrl = (session: ScheduledSession): string => {
  const base = 'https://voieveritevie.org/calls-lives';
  const time = session.scheduled_time.slice(0, 5); // HH:MM — drop seconds
  const parts = [
    `session=${encodeURIComponent(session.id)}`,
    `title=${encodeURIComponent(session.title)}`,
    `date=${session.scheduled_date}`,
    `time=${encodeURIComponent(time)}`,
    `type=${encodeURIComponent(session.session_type)}`,
  ];
  if (session.description) {
    // Truncate so the URL stays reasonable; edge function uses it for og:description
    const desc = session.description.slice(0, 200);
    parts.push(`desc=${encodeURIComponent(desc)}`);
  }
  if (session.thumbnail_url) parts.push(`img=${encodeURIComponent(session.thumbnail_url)}`);
  return `${base}?${parts.join('&')}`;
};

/** Maps session type + title keywords to a human-readable French label. */
const getSessionLabel = (type: string, title: string): string => {
  const t = (title || '').toLowerCase();
  if (/pri[eè]re|adoration|chapelet|rosaire|onction/.test(t)) return 'la Prière';
  if (/d[eé]bat|inquisition|discussion|forum/.test(t)) return 'le Débat';
  if (/messe|eucharistie|liturgie/.test(t)) return 'la Messe';
  if (/conf[eé]rence/.test(t)) return 'la Conférence';
  if (/formation|cours/.test(t)) return 'la Formation';
  if (/veill[eé]e/.test(t)) return 'la Veillée';
  if (/louange|worship/.test(t)) return 'la Louange';
  if (/partage|t[eé]moignage/.test(t)) return 'le Partage';
  if (/retraite/.test(t)) return 'la Retraite';
  if (type === 'video') return 'la Visioconférence';
  if (type === 'live') return 'le Live';
  return "l'Appel";
};

const formatGmtTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m} GMT`;
};

import {
  Radio, Video, Mic, Calendar as CalendarIcon, Clock, Users, Play,
  Bell, Share2, Download, Trash2, Plus, Eye,
  Loader2, Sparkles, Crown, X, Pencil, Rocket, Upload,
  BookOpen, ChevronDown, ChevronUp, TrendingUp, Activity,
} from 'lucide-react';

const EMOJI_REACTIONS = ['👏', '🙏', '❤️', '🔥', '😂', '🕊️'];

interface ScheduledSession {
  id: string;
  title: string;
  description: string | null;
  session_type: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: number | null;
  access_type: string;
  recurrence: string;
  share_link: string | null;
  status: string;
  tags: string[] | null;
  agenda: any[] | null;
  video_room_id: string | null;
  recording_url: string | null;
  thumbnail_url: string | null;
  viewer_count: number | null;
  platforms: any;
  created_by: string;
  created_at: string;
}

/* ─── Countdown timer ─── */
const CountdownTimer = ({ targetDate, targetTime }: { targetDate: string; targetTime: string }) => {
  const [secsLeft, setSecsLeft] = useState(0);

  useEffect(() => {
    const calc = () => {
      const target = new Date(`${targetDate}T${targetTime}`);
      setSecsLeft(Math.max(0, differenceInSeconds(target, new Date())));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate, targetTime]);

  if (secsLeft <= 0) return null;

  const h = Math.floor(secsLeft / 3600);
  const m = Math.floor((secsLeft % 3600) / 60);
  const s = secsLeft % 60;

  return (
    <div className="inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
      {h > 0 && (
        <>
          <span className="px-1.5 py-0.5 rounded bg-muted/80">{String(h).padStart(2, '0')}</span>
          <span className="text-muted-foreground">h</span>
        </>
      )}
      <span className="px-1.5 py-0.5 rounded bg-muted/80">{String(m).padStart(2, '0')}</span>
      <span className="text-muted-foreground">m</span>
      <span className="px-1.5 py-0.5 rounded bg-muted/80">{String(s).padStart(2, '0')}</span>
      <span className="text-muted-foreground">s</span>
    </div>
  );
};

/* ─── Session type helpers ─── */
function getTypeConfig(type: string) {
  switch (type) {
    case 'audio': return {
      label: 'Audio', emoji: '🎙️',
      iconEl: <Mic className="h-full w-full" />,
      colorClass: 'text-violet-400',
      bgClass: 'bg-violet-500/15',
      borderClass: 'border-violet-500/30',
      gradientClass: 'from-violet-500/10 to-transparent',
      glowClass: 'shadow-violet-500/20',
    };
    case 'live': return {
      label: 'Live', emoji: '🔴',
      iconEl: <Radio className="h-full w-full" />,
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/15',
      borderClass: 'border-red-500/30',
      gradientClass: 'from-red-500/10 to-transparent',
      glowClass: 'shadow-red-500/20',
    };
    default: return {
      label: 'Vidéo', emoji: '📹',
      iconEl: <Video className="h-full w-full" />,
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-500/15',
      borderClass: 'border-blue-500/30',
      gradientClass: 'from-blue-500/10 to-transparent',
      glowClass: 'shadow-blue-500/20',
    };
  }
}

const CallsAndLives = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [myReminders, setMyReminders] = useState<Set<string>>(new Set());

  const dateLocale = i18n.language === 'fr' ? fr : i18n.language === 'it' ? it : enUS;

  useEffect(() => {
    fetchSessions();
    if (user) fetchReminders();

    const channel = supabase
      .channel('scheduled-sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('scheduled_sessions' as any)
      .select('*')
      .order('scheduled_date', { ascending: true });
    if (!error && data) setSessions(data as any);
    setLoading(false);
  };

  const fetchReminders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('session_reminders' as any)
      .select('session_id')
      .eq('user_id', user.id);
    if (data) setMyReminders(new Set((data as any[]).map((r: any) => r.session_id)));
  };

  const liveSessions = useMemo(() => sessions.filter(s => s.status === 'live'), [sessions]);
  const scheduledSessions = useMemo(() => sessions.filter(s => s.status === 'scheduled'), [sessions]);
  const endedSessions = useMemo(() => sessions.filter(s => s.status === 'ended'), [sessions]);

  const toggleReminder = async (sessionId: string) => {
    if (!user) { toast.error(t('calls.loginRequired')); return; }
    if (myReminders.has(sessionId)) {
      await supabase.from('session_reminders' as any).delete().eq('session_id', sessionId).eq('user_id', user.id);
      setMyReminders(prev => { const n = new Set(prev); n.delete(sessionId); return n; });
      toast.success(t('calls.reminderRemoved'));
    } else {
      await supabase.from('session_reminders' as any).insert({ session_id: sessionId, user_id: user.id } as any);
      setMyReminders(prev => new Set(prev).add(sessionId));
      toast.success(t('calls.reminderSet'));
    }
  };

  const copyShareLink = async (session: ScheduledSession) => {
    const link = buildShareUrl(session);
    const label = getSessionLabel(session.session_type, session.title);
    const statusEmoji = session.status === 'live' ? '🔴 EN DIRECT' : '📅';
    const shareTitle = `Lien pour rejoindre ${label}`;
    const fullDate = formatScheduledFull(session);
    const descLine = session.description ? `\n${session.description}` : '';
    const body = `${statusEmoji} *${session.title}*\n${fullDate}${descLine}\n\n${shareTitle} :\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: body, url: link });
        return;
      } catch { /* user cancelled or API not available */ }
    }
    try {
      await navigator.clipboard.writeText(body);
      toast.success(t('calls.linkCopied'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const formatScheduledFull = (session: ScheduledSession) => {
    const d = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
    return `${format(d, 'PPP', { locale: dateLocale })} • ${formatGmtTime(session.scheduled_time)}`;
  };

  const { primeAudioPlayback } = useCallSession();

  const joinSession = (session: ScheduledSession) => {
    if (session.video_room_id) {
      primeAudioPlayback();
      navigate(`/meeting/${session.video_room_id}`);
    } else {
      toast.info(t('calls.sessionNotStarted'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('calls.pageTitle')} — Voie Vérité Vie</title>
        <meta name="description" content={t('calls.pageDescription')} />
      </Helmet>
      <Navigation />

      {/* ── Hero ── */}
      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral">
        <div className="absolute inset-0 bg-gradient-stained opacity-60 pointer-events-none" />
        <div className="absolute inset-0 stained-shimmer opacity-40 pointer-events-none" />

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative container mx-auto px-4 pt-28 pb-10 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <Sparkles className="h-3.5 w-3.5 text-cathedral-gold" />
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">
              {t('calls.heroBadge', 'Communauté en direct')}
            </span>
          </div>

          <h1 className="font-cinzel text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight drop-shadow-lg">
            {t('calls.pageTitle')}
          </h1>
          <div className="cathedral-line w-32 h-px mx-auto my-5" />
          <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {t('calls.pageDescription')}
          </p>

          {/* Live badge */}
          {liveSessions.length > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/90 text-accent-foreground shadow-[0_0_40px_hsl(var(--accent)/0.6)] animate-pulse">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest">
                {liveSessions.length} {t('calls.liveNow')}
              </span>
            </div>
          )}

          {/* Stats strip */}
          {!loading && (
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              {[
                { icon: <Radio className="h-3.5 w-3.5" />, count: liveSessions.length, label: 'En direct' },
                { icon: <CalendarIcon className="h-3.5 w-3.5" />, count: scheduledSessions.length, label: 'Planifiés' },
                { icon: <Play className="h-3.5 w-3.5" />, count: endedSessions.length, label: 'Enregistrements' },
              ].map(({ icon, count, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-xs">
                  {icon}
                  <span className="font-bold text-white">{count}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "w-full h-auto grid gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border/60",
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          )}>
            <TabsTrigger value="live" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary rounded-lg transition-all">
              <Radio className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.live')}</span>
              <span className="sm:hidden">Live</span>
              {liveSessions.length > 0 && (
                <span className="relative flex h-2 w-2 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary rounded-lg transition-all">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.scheduled')}</span>
              <span className="sm:hidden">{t('calls.tabs.scheduledShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="recordings" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary rounded-lg transition-all">
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.recordings')}</span>
              <span className="sm:hidden">{t('calls.tabs.recordingsShort')}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary rounded-lg transition-all">
                <Crown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('calls.tabs.admin')}</span>
                <span className="sm:hidden">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="live" className="mt-6">
            <LiveNowTab sessions={liveSessions} isAdmin={isAdmin} onJoin={joinSession} onRefresh={fetchSessions} t={t} dateLocale={dateLocale} />
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            <ScheduledTab sessions={scheduledSessions} isAdmin={isAdmin} myReminders={myReminders} onToggleReminder={toggleReminder} onCopyLink={copyShareLink} onJoin={joinSession} onScheduleNew={() => setShowScheduleDialog(true)} onRefresh={fetchSessions} t={t} dateLocale={dateLocale} />
          </TabsContent>

          <TabsContent value="recordings" className="mt-6">
            <RecordingsTab sessions={endedSessions} isAdmin={isAdmin} t={t} dateLocale={dateLocale} onRefresh={fetchSessions} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="mt-6">
              <AdminControlTab sessions={sessions} onRefresh={fetchSessions} t={t} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <ScheduleSessionDialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog} onCreated={() => { fetchSessions(); setShowScheduleDialog(false); }} t={t} dateLocale={dateLocale} />
    </div>
  );
};

/* ════════════════════════════════════════════
   LIVE NOW TAB
════════════════════════════════════════════ */
const LiveNowTab = ({ sessions, isAdmin, onJoin, t, dateLocale, onRefresh }: any) => {
  const { user } = useAuth();
  const [prayerCount, setPrayerCount] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [starting, setStarting] = useState(false);
  const [sessionToEnd, setSessionToEnd] = useState<ScheduledSession | null>(null);
  const [quickFlyerFile, setQuickFlyerFile] = useState<File | null>(null);
  const [quickFlyerUrl, setQuickFlyerUrl] = useState<string | null>(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

  const handleQuickFlyerChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setQuickFlyerFile(file);
    setUploadingFlyer(true);
    const path = `quick/${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('video-flyers').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('video-flyers').getPublicUrl(path);
      setQuickFlyerUrl(data.publicUrl);
    }
    setUploadingFlyer(false);
  };

  const sendReaction = (emoji: string) => {
    const id = Date.now();
    const x = 10 + Math.random() * 80;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    if (emoji === '🙏') setPrayerCount(c => c + 1);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2000);
  };

  const startSession = async (type: 'audio' | 'video' | 'live') => {
    if (!user) return;
    setStarting(true);
    try {
      const { data: room, error: roomError } = await supabase
        .from('video_rooms')
        .insert({
          title: type === 'audio' ? t('calls.quickAudioCall') : type === 'video' ? t('calls.quickVideoCall') : t('calls.quickLiveStream'),
          room_type: type === 'live' ? 'broadcast' : type,
          status: 'active',
          created_by: user.id,
          started_at: new Date().toISOString(),
          ...(quickFlyerUrl ? { flyer_url: quickFlyerUrl } : {}),
        } as any)
        .select('id')
        .single();

      if (roomError) throw roomError;

      const { error: sessionError } = await supabase
        .from('scheduled_sessions' as any)
        .insert({
          title: type === 'audio' ? t('calls.quickAudioCall') : type === 'video' ? t('calls.quickVideoCall') : t('calls.quickLiveStream'),
          session_type: type,
          scheduled_date: format(new Date(), 'yyyy-MM-dd'),
          scheduled_time: format(new Date(), 'HH:mm:ss'),
          estimated_duration: 60,
          access_type: 'open',
          recurrence: 'once',
          status: 'live',
          created_by: user.id,
          video_room_id: room.id,
          ...(quickFlyerUrl ? { thumbnail_url: quickFlyerUrl } : {}),
        } as any);

      if (sessionError) throw sessionError;

      try {
        const { data: created } = await (supabase as any)
          .from('scheduled_sessions' as any)
          .select('id')
          .eq('video_room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (created && (created as any).id) {
          supabase.functions.invoke('notify-session', {
            body: { session_id: (created as any).id, kind: 'live', target: 'all' },
          }).catch((e) => console.warn('notify-session failed', e));
        }
      } catch (e) { console.warn(e); }

      const sessionTitle = type === 'audio'
        ? t('calls.quickAudioCall')
        : type === 'video' ? t('calls.quickVideoCall') : t('calls.quickLiveStream');
      sendCallJoinNotification(sessionTitle, room.id, user.name ?? user.email ?? undefined).catch(() => {});

      toast.success(t('calls.sessionStarted'));
      onRefresh();
    } catch (err: any) {
      console.error('Failed to start session:', err);
      toast.error(t('common.error'));
    } finally {
      setStarting(false);
    }
  };

  const endSession = async (session: ScheduledSession) => {
    try {
      await supabase.from('scheduled_sessions' as any).update({ status: 'ended' } as any).eq('id', session.id);
      if (session.video_room_id) {
        await supabase.from('video_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', session.video_room_id);
      }
      toast.success(t('calls.sessionEnded'));
      onRefresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <>
      <AlertDialog open={!!sessionToEnd} onOpenChange={(open) => !open && setSessionToEnd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminer la session en direct ?</AlertDialogTitle>
            <AlertDialogDescription>
              La session « {sessionToEnd?.title} » sera marquée comme terminée. Les participants seront déconnectés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (sessionToEnd) { void endSession(sessionToEnd); setSessionToEnd(null); } }} className="bg-red-600 hover:bg-red-700 text-white">
              Terminer la session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Admin: Start buttons */}
        {isAdmin && sessions.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-cathedral-gold/30 bg-gradient-to-br from-card via-card to-primary/5 p-8">
            <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-accent/8 blur-3xl" />

            <div className="relative text-center mb-8">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.25)] mb-4">
                <Radio className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-cinzel text-2xl font-bold text-foreground mb-1">{t('calls.startNewSession')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('calls.startNewSessionDesc')}</p>
            </div>

            {/* Optional flyer image */}
            <div className="max-w-2xl mx-auto mb-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="h-4 w-4" />
                  {quickFlyerUrl ? 'Image ajoutée ✓' : 'Ajouter une image (facultatif)'}
                  {uploadingFlyer && <Loader2 className="h-3 w-3 animate-spin" />}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleQuickFlyerChange} />
              </label>
              {quickFlyerUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={quickFlyerUrl} alt="flyer" className="h-12 w-20 object-cover rounded-lg border border-border/60" />
                  <button onClick={() => { setQuickFlyerUrl(null); setQuickFlyerFile(null); }} className="text-xs text-destructive hover:underline">
                    Supprimer
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {/* Audio */}
              <button
                onClick={() => startSession('audio')}
                disabled={starting}
                className="group relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent hover:from-violet-500/20 hover:border-violet-500/50 transition-all p-6 text-left disabled:opacity-50 hover:shadow-[0_8px_30px_rgba(139,92,246,0.2)]"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-colors" />
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Mic className="h-5 w-5 text-violet-400" />
                  </div>
                  <p className="font-bold text-foreground text-sm mb-1">{t('calls.startAudio')}</p>
                  <p className="text-xs text-muted-foreground">{t('calls.type.audio')}</p>
                </div>
              </button>

              {/* Video */}
              <button
                onClick={() => startSession('video')}
                disabled={starting}
                className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent hover:from-blue-500/20 hover:border-blue-500/50 transition-all p-6 text-left disabled:opacity-50 hover:shadow-[0_8px_30px_rgba(59,130,246,0.2)]"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-colors" />
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Video className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="font-bold text-foreground text-sm mb-1">{t('calls.startVideo')}</p>
                  <p className="text-xs text-muted-foreground">{t('calls.type.video')}</p>
                </div>
              </button>

              {/* Live broadcast */}
              <button
                onClick={() => startSession('live')}
                disabled={starting}
                className="group relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent hover:from-red-500/20 hover:border-red-500/60 transition-all p-6 text-left disabled:opacity-50 hover:shadow-[0_8px_30px_rgba(239,68,68,0.25)]"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-red-500/15 blur-2xl group-hover:bg-red-500/25 transition-colors" />
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Radio className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-foreground text-sm">{t('calls.startLive')}</p>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('calls.type.live')}</p>
                </div>
              </button>
            </div>

            {starting && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Démarrage en cours…
              </div>
            )}
          </div>
        )}

        {/* No live – non-admin */}
        {!isAdmin && sessions.length === 0 && (
          <div className="text-center py-20 px-4">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-3xl" />
              <div className="relative h-24 w-24 rounded-full border border-red-500/20 bg-gradient-to-br from-card to-red-500/5 flex items-center justify-center">
                <Radio className="h-10 w-10 text-red-400/50" />
              </div>
            </div>
            <h3 className="font-cinzel text-2xl font-semibold text-foreground mb-2">{t('calls.noLive')}</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">{t('calls.noLiveDesc')}</p>
            <div className="cathedral-line w-24 h-px mx-auto mt-6 opacity-50" />
          </div>
        )}

        {/* Live session cards */}
        {sessions.map((session: ScheduledSession) => (
          <div key={session.id} className="relative overflow-hidden rounded-2xl border border-accent/50 bg-gradient-to-br from-accent/5 via-card to-background shadow-[0_0_60px_-20px_hsl(var(--accent)/0.5)]">
            {/* Floating emojis */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {floatingEmojis.map(e => (
                <span key={e.id} className="absolute text-3xl" style={{ left: `${e.x}%`, bottom: 0, animation: 'floatUp 2s ease-out forwards' }}>
                  {e.emoji}
                </span>
              ))}
            </div>

            {/* Live banner */}
            <div className="relative flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-accent via-accent/90 to-accent/80 text-accent-foreground">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white" />
              </span>
              <span className="font-black text-sm uppercase tracking-[0.25em]">🔴 {t('calls.liveNow')}</span>
              <div className="ml-auto flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-bold bg-white/20 px-2.5 py-1 rounded-full">
                  <Eye className="h-3.5 w-3.5" /> {session.viewer_count || 0}
                </span>
              </div>
            </div>

            {/* Thumbnail/flyer image */}
            {session.thumbnail_url && (
              <img
                src={session.thumbnail_url}
                alt={session.title}
                className="w-full max-h-56 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}

            <div className="p-6 sm:p-8">
              {/* Session type badge */}
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const cfg = getTypeConfig(session.session_type);
                  return (
                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium", cfg.bgClass, cfg.colorClass, cfg.borderClass)}>
                      <span className="h-3 w-3">{cfg.iconEl}</span>
                      {cfg.label}
                    </span>
                  );
                })()}
                {session.estimated_duration && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground">
                    <Clock className="h-3 w-3" /> {session.estimated_duration} min
                  </span>
                )}
              </div>

              <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-foreground mb-2 leading-tight">{session.title}</h2>
              {session.description && (
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{session.description}</p>
              )}

              {/* Join button */}
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-bold text-base py-6 mb-6 shadow-[0_8px_30px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_hsl(var(--primary)/0.5)] transition-all rounded-xl"
                onClick={() => onJoin(session)}
              >
                ➡️ {t('calls.joinNow')}
              </Button>

              {/* Reactions strip */}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <button
                    onClick={() => sendReaction('🙏')}
                    className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <span className="text-2xl">🙏</span>
                    <div className="text-left">
                      <p className="font-bold text-foreground text-lg leading-none">{prayerCount}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('calls.prayers', 'prières')}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 flex-wrap">
                    {EMOJI_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="text-xl p-2 rounded-full hover:bg-muted/70 transition-transform hover:scale-125 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin controls */}
              {isAdmin && (
                <div className="mt-5 pt-4 border-t border-border/60">
                  <p className="text-xs text-cathedral-gold uppercase tracking-[0.2em] mb-3 font-semibold flex items-center gap-1.5">
                    <Crown className="h-3 w-3" /> {t('calls.adminControls')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="destructive" size="sm" onClick={() => setSessionToEnd(session)} className="gap-1.5 rounded-lg">
                      <X className="h-3.5 w-3.5" /> {t('calls.endSession')}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
                      🔇 {t('calls.muteAll')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/* ════════════════════════════════════════════
   SCHEDULED TAB
════════════════════════════════════════════ */
const ScheduledTab = ({ sessions, isAdmin, myReminders, onToggleReminder, onCopyLink, onJoin, onScheduleNew, t, dateLocale, onRefresh }: any) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { primeAudioPlayback } = useCallSession();
  const [editingSession, setEditingSession] = useState<ScheduledSession | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const handleLaunchCall = async (session: ScheduledSession) => {
    if (!user) return;
    setLaunchingId(session.id);
    try {
      const { data: room, error: roomError } = await supabase
        .from('video_rooms')
        .insert({
          title: session.title,
          room_type: session.session_type === 'live' ? 'broadcast' : (session.session_type as 'audio' | 'video'),
          status: 'active',
          created_by: user.id,
          started_at: new Date().toISOString(),
          ...(session.thumbnail_url ? { flyer_url: session.thumbnail_url } : {}),
        } as any)
        .select('id')
        .single();
      if (roomError) throw roomError;

      await supabase.from('scheduled_sessions' as any).update({
        status: 'live',
        video_room_id: room.id,
      } as any).eq('id', session.id);

      supabase.functions.invoke('notify-session', {
        body: { session_id: session.id, kind: 'live', target: 'all' },
      }).catch((e) => console.warn('notify-session failed', e));

      toast.success('Appel lancé !');
      onRefresh();
      primeAudioPlayback();
      navigate(`/meeting/${room.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de lancer l\'appel');
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {editingSession && (
        <EditSessionDialog
          session={editingSession}
          onOpenChange={(open: boolean) => !open && setEditingSession(null)}
          onUpdated={() => { setEditingSession(null); onRefresh(); }}
          t={t}
          dateLocale={dateLocale}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="font-cinzel text-xl font-semibold text-foreground">{t('calls.tabs.scheduled')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} {t('calls.upcomingSessions', 'sessions à venir')}</p>
        </div>
        {isAdmin && (
          <Button onClick={onScheduleNew} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_25px_hsl(var(--primary)/0.45)] rounded-xl">
            <Plus className="h-4 w-4 mr-1.5" /> {t('calls.scheduleNew')}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {sessions.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative h-24 w-24 rounded-full border border-blue-500/20 bg-gradient-to-br from-card to-blue-500/5 flex items-center justify-center">
              <CalendarIcon className="h-10 w-10 text-blue-400/50" />
            </div>
          </div>
          <h3 className="font-cinzel text-2xl font-semibold text-foreground mb-2">{t('calls.noScheduled')}</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">{t('calls.noScheduledDesc')}</p>
          <div className="cathedral-line w-24 h-px mx-auto mt-6 opacity-50" />
        </div>
      ) : (
        sessions.map((session: ScheduledSession) => {
          const sessionDateTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
          const now = new Date();
          const minutesUntil = differenceInMinutes(sessionDateTime, now);
          const isStartingSoon = minutesUntil > 0 && minutesUntil <= 60;
          const isStartingNow = minutesUntil <= 5 && minutesUntil >= -5;
          const isTodaySession = isToday(sessionDateTime);
          const cfg = getTypeConfig(session.session_type);

          return (
            <div
              key={session.id}
              className={cn(
                "group relative rounded-2xl border overflow-hidden transition-all hover:shadow-[0_8px_40px_-10px_hsl(var(--primary)/0.2)]",
                isStartingNow
                  ? "border-accent/60 bg-gradient-to-br from-accent/8 to-card shadow-[0_0_30px_-5px_hsl(var(--accent)/0.3)]"
                  : isStartingSoon
                  ? "border-cathedral-gold/40 bg-gradient-to-br from-amber-500/5 to-card"
                  : "border-border/70 bg-card hover:border-primary/30"
              )}
            >
              {/* Left accent bar */}
              <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", cfg.bgClass)} />

              <div className="pl-5 pr-5 sm:pr-6 pt-5 pb-5 sm:pt-6 sm:pb-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {isStartingNow && (
                        <Badge className="bg-accent text-accent-foreground text-xs animate-pulse px-2.5">
                          🔴 {t('calls.startingNow')}
                        </Badge>
                      )}
                      {isStartingSoon && !isStartingNow && (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 text-xs gap-1.5">
                          ⏱️ <CountdownTimer targetDate={session.scheduled_date} targetTime={session.scheduled_time} />
                        </Badge>
                      )}
                      {isTodaySession && !isStartingSoon && !isStartingNow && (
                        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs">
                          Aujourd'hui
                        </Badge>
                      )}
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium", cfg.bgClass, cfg.colorClass, cfg.borderClass)}>
                        <span className="h-3 w-3">{cfg.iconEl}</span>
                        {cfg.label}
                      </span>
                    </div>

                    <h3 className="font-cinzel font-bold text-foreground text-lg sm:text-xl">{session.title}</h3>

                    {session.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{session.description}</p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        {format(new Date(session.scheduled_date), 'PPP', { locale: dateLocale })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {formatGmtTime(session.scheduled_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        ⏱️ {session.estimated_duration} min
                      </span>
                      {session.recurrence !== 'once' && (
                        <Badge variant="secondary" className="text-xs">
                          🔁 {t(`calls.recurrence.${session.recurrence}`)}
                        </Badge>
                      )}
                    </div>

                    {/* Associated text */}
                    {(() => {
                      const assocText = (session.agenda as any[])?.find((a: any) => a.__type === 'associated_text');
                      if (!assocText) return null;
                      const src = ASSOCIATED_TEXT_SOURCES.find(s => s.value === assocText.source);
                      return (
                        <div className="mt-2">
                          <a href={assocText.href || src?.href || '/messe-office'} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                            <BookOpen className="h-3 w-3" />
                            {src?.label?.replace(/^.{2}\s/, '') || 'Texte associé'}
                          </a>
                        </div>
                      );
                    })()}

                    {/* Tags */}
                    {session.tags && session.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {session.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date column (large screens) */}
                  <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                    <p className="text-2xl font-black font-cinzel text-foreground leading-none">
                      {format(new Date(session.scheduled_date), 'd')}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {format(new Date(session.scheduled_date), 'MMM', { locale: dateLocale })}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/40 flex-wrap">
                  {isAdmin && !session.video_room_id && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-[0_4px_15px_hsl(var(--accent)/0.3)] rounded-lg gap-1.5"
                      onClick={() => handleLaunchCall(session)}
                      disabled={launchingId === session.id}
                    >
                      {launchingId === session.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Rocket className="h-3.5 w-3.5" />}
                      Lancer l'appel
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => setEditingSession(session)}>
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </Button>
                  )}
                  {isStartingNow && session.video_room_id ? (
                    <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_4px_15px_hsl(var(--primary)/0.3)] rounded-lg" onClick={() => onJoin(session)}>
                      ➡️ {t('calls.joinNow')}
                    </Button>
                  ) : !session.video_room_id ? null : (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onJoin(session)}>
                      ➡️ {t('calls.joinNow')}
                    </Button>
                  )}
                  {!isStartingNow && !session.video_room_id && (
                    <Button size="sm" variant={myReminders.has(session.id) ? "secondary" : "outline"} onClick={() => onToggleReminder(session.id)} className="rounded-lg">
                      <Bell className={cn("h-4 w-4 mr-1.5", myReminders.has(session.id) && "fill-current")} />
                      {myReminders.has(session.id) ? t('calls.reminded') : t('calls.remindMe')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onCopyLink(session)} className="rounded-lg">
                    <Share2 className="h-4 w-4 mr-1.5" /> {t('calls.share')}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => {
                    const start = `${session.scheduled_date.replace(/-/g, '')}T${session.scheduled_time.replace(/:/g, '').slice(0, 6)}Z`;
                    const endDate = new Date(`${session.scheduled_date}T${session.scheduled_time}Z`);
                    endDate.setMinutes(endDate.getMinutes() + (session.estimated_duration || 60));
                    const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${start}/${endStr}&details=${encodeURIComponent((session.description || '') + '\n\n' + buildShareUrl(session))}`;
                    window.open(url, '_blank');
                  }}>
                    📅 {t('calls.addToCalendar')}
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   RECORDINGS TAB
════════════════════════════════════════════ */
const RecordingsTab = ({ sessions, isAdmin, t, dateLocale, onRefresh }: any) => {
  const deleteRecording = async (id: string) => {
    await supabase.from('scheduled_sessions' as any).delete().eq('id', id);
    onRefresh();
    toast.success(t('calls.recordingDeleted'));
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="relative inline-flex mb-6">
          <div className="absolute inset-0 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative h-24 w-24 rounded-full border border-violet-500/20 bg-gradient-to-br from-card to-violet-500/5 flex items-center justify-center">
            <Play className="h-10 w-10 text-violet-400/50" />
          </div>
        </div>
        <h3 className="font-cinzel text-2xl font-semibold text-foreground mb-2">{t('calls.noRecordings')}</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">{t('calls.noRecordingsDesc')}</p>
        <div className="cathedral-line w-24 h-px mx-auto mt-6 opacity-50" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {sessions.map((session: ScheduledSession) => {
        const cfg = getTypeConfig(session.session_type);
        return (
          <div key={session.id} className="group rounded-2xl border border-border/70 bg-card overflow-hidden hover:border-primary/40 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.2)] transition-all">
            {/* Thumbnail */}
            <div className="aspect-video relative overflow-hidden">
              {session.thumbnail_url ? (
                <img src={session.thumbnail_url} alt={session.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", cfg.gradientClass, "from-muted to-muted/30")}>
                  <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center border", cfg.bgClass, cfg.borderClass)}>
                    <span className={cn("h-8 w-8", cfg.colorClass)}>{cfg.iconEl}</span>
                  </div>
                </div>
              )}

              {/* Duration badge */}
              <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm font-bold border border-border/40">
                {session.estimated_duration} min
              </div>

              {/* Session type badge */}
              <div className={cn("absolute top-2 left-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border font-medium backdrop-blur-sm", cfg.bgClass, cfg.colorClass, cfg.borderClass)}>
                <span className="h-3 w-3">{cfg.iconEl}</span>
                {cfg.label}
              </div>

              {/* Play overlay */}
              {session.recording_url && (
                <a href={session.recording_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <div className="h-16 w-16 rounded-full bg-primary/95 flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.6)] hover:scale-110 transition-transform">
                    <Play className="h-7 w-7 text-primary-foreground ml-0.5" fill="currentColor" />
                  </div>
                </a>
              )}
            </div>

            <div className="p-5">
              <h3 className="font-cinzel font-bold text-foreground line-clamp-1 text-base mb-1">{session.title}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(new Date(session.scheduled_date), 'PP', { locale: dateLocale })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {session.viewer_count || 0}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                {session.recording_url ? (
                  <>
                    <Button size="sm" variant="outline" className="rounded-lg" asChild>
                      <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                        <Play className="h-3.5 w-3.5 mr-1.5" /> {t('calls.play')}
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-lg" asChild>
                      <a href={session.recording_url} download>
                        <Download className="h-3.5 w-3.5 mr-1.5" /> {t('calls.download')}
                      </a>
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">{t('calls.noRecordingFile')}</span>
                )}
                {isAdmin && (
                  <Button size="sm" variant="ghost" className="ml-auto text-destructive rounded-lg" onClick={() => deleteRecording(session.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════
   ADMIN CONTROL TAB
════════════════════════════════════════════ */
const AdminControlTab = ({ sessions, onRefresh, t }: any) => {
  const totalSessions = sessions.length;
  const liveSessions = sessions.filter((s: any) => s.status === 'live').length;
  const scheduledCount = sessions.filter((s: any) => s.status === 'scheduled').length;
  const totalViewers = sessions.reduce((sum: number, s: any) => sum + (s.viewer_count || 0), 0);

  const cancelSession = async (id: string) => {
    await supabase.from('scheduled_sessions' as any).update({ status: 'cancelled' } as any).eq('id', id);
    onRefresh();
    toast.success(t('calls.sessionCancelled'));
  };

  const deleteSession = async (id: string) => {
    await supabase.from('scheduled_sessions' as any).delete().eq('id', id);
    onRefresh();
    toast.success(t('calls.sessionDeleted'));
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div>
        <h3 className="text-xs font-semibold text-cathedral-gold uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> {t('calls.admin.analytics')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Activity className="h-5 w-5 text-blue-400" />, value: totalSessions, label: t('calls.admin.totalSessions'), bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { icon: <Radio className="h-5 w-5 text-red-400" />, value: liveSessions, label: t('calls.admin.activeLive'), bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { icon: <CalendarIcon className="h-5 w-5 text-violet-400" />, value: scheduledCount, label: 'Planifiés', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
            { icon: <Users className="h-5 w-5 text-cathedral-gold" />, value: totalViewers, label: t('calls.admin.totalViewers'), bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          ].map(({ icon, value, label, bg, border }) => (
            <div key={label} className={cn("relative overflow-hidden rounded-2xl border p-5 text-center hover:scale-[1.02] transition-transform cursor-default", bg, border)}>
              <div className="flex justify-center mb-2">{icon}</div>
              <p className="font-cinzel text-3xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="cathedral-line h-px w-full opacity-40" />

      {/* Session list */}
      <div>
        <h3 className="text-xs font-semibold text-cathedral-gold uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" /> {t('calls.admin.manageSessions')}
        </h3>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">{t('calls.admin.noSessions')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session: ScheduledSession) => {
              const cfg = getTypeConfig(session.session_type);
              return (
                <div key={session.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/70 bg-card hover:border-primary/30 hover:bg-muted/20 transition-all group">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", cfg.bgClass, cfg.borderClass)}>
                    <span className={cn("h-4 w-4", cfg.colorClass)}>{cfg.iconEl}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.scheduled_date), 'PP')} • {formatGmtTime(session.scheduled_time)}
                    </p>
                  </div>
                  <Badge className={cn("text-xs shrink-0",
                    session.status === 'live' ? 'bg-accent text-accent-foreground' :
                    session.status === 'scheduled' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {t(`calls.status.${session.status}`)}
                  </Badge>
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    {session.status === 'scheduled' && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => cancelSession(session.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-destructive" onClick={() => deleteSession(session.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   SCHEDULE DIALOG
════════════════════════════════════════════ */
const ASSOCIATED_TEXT_SOURCES = [
  { value: 'liturgy', label: '📖 Textes liturgiques du jour (Messe et Office AELF)', href: '/messe-office' },
  { value: 'biblical', label: '📚 Lecture biblique du programme annuel', href: '/biblical-reading' },
  { value: 'novena', label: '🕯️ Neuvaine du moment', href: '/neuvaines' },
  { value: 'careme', label: '✝️ Réflexion du Carême', href: '/careme' },
];

const ScheduleSessionDialog = ({ open, onOpenChange, onCreated, t, dateLocale }: any) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionType, setSessionType] = useState('video');
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('19:00');
  const [duration, setDuration] = useState('60');
  const [accessType, setAccessType] = useState('open');
  const [recurrence, setRecurrence] = useState('once');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTextOption, setShowTextOption] = useState(false);
  const [associatedTextSource, setAssociatedTextSource] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const handleThumbChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingThumb(true);
    const path = `scheduled/${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('video-flyers').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('video-flyers').getPublicUrl(path);
      setThumbnailUrl(data.publicUrl);
    }
    setUploadingThumb(false);
  };

  const handleCreate = async () => {
    if (!title || !date || !user) return;
    setSaving(true);

    const agendaData = associatedTextSource
      ? [{ __type: 'associated_text', source: associatedTextSource, href: ASSOCIATED_TEXT_SOURCES.find(s => s.value === associatedTextSource)?.href || '' }]
      : null;

    const { data: inserted, error } = await (supabase as any).from('scheduled_sessions' as any).insert({
      title,
      description: description || null,
      session_type: sessionType,
      scheduled_date: format(date, 'yyyy-MM-dd'),
      scheduled_time: time + ':00',
      estimated_duration: parseInt(duration),
      access_type: accessType,
      recurrence,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      created_by: user.id,
      status: 'scheduled',
      agenda: agendaData,
      thumbnail_url: thumbnailUrl,
    } as any).select('id').maybeSingle();

    setSaving(false);
    if (error) {
      toast.error(t('common.error'));
    } else {
      if (inserted?.id) {
        supabase.functions.invoke('notify-session', {
          body: { session_id: inserted.id, kind: 'scheduled', target: 'all' },
        }).catch((e) => console.warn('notify-session failed', e));
      }
      toast.success(t('calls.sessionCreated'));
      setTitle(''); setDescription(''); setDate(undefined); setThumbnailUrl(null);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinzel flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('calls.scheduleNew')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-foreground">{t('calls.form.title')}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('calls.form.titlePlaceholder')} className="mt-1 rounded-lg" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">{t('calls.form.description')}</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.type')}</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="audio">🎙️ {t('calls.type.audio')}</SelectItem>
                  <SelectItem value="video">📹 {t('calls.type.video')}</SelectItem>
                  <SelectItem value="live">🔴 {t('calls.type.live')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.access')}</label>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">🌐 {t('calls.access.open')}</SelectItem>
                  <SelectItem value="members">🔒 {t('calls.access.members')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.date')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal rounded-lg">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: dateLocale }) : t('calls.form.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.time')}</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.duration')}</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1h</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2h</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.recurrence')}</label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{t('calls.recurrence.once')}</SelectItem>
                  <SelectItem value="daily">{t('calls.recurrence.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('calls.recurrence.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('calls.recurrence.monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">{t('calls.form.tags')}</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder={t('calls.form.tagsPlaceholder')} className="mt-1 rounded-lg" />
          </div>

          {/* Thumbnail image */}
          <div>
            <label className="text-sm font-medium text-foreground">Image / affiche (facultatif)</label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-primary hover:text-primary transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploadingThumb ? 'Chargement…' : thumbnailUrl ? 'Changer l\'image' : 'Choisir une image'}
                  {uploadingThumb && <Loader2 className="h-3 w-3 animate-spin" />}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbChange} />
              </label>
              {thumbnailUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={thumbnailUrl} alt="thumbnail" className="h-14 w-24 object-cover rounded-lg border border-border/60" />
                  <button onClick={() => setThumbnailUrl(null)} className="text-xs text-destructive hover:underline">Supprimer</button>
                </div>
              )}
            </div>
          </div>

          {/* Associated text */}
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTextOption(!showTextOption)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Associer un texte à cet appel
                {associatedTextSource && (
                  <span className="text-xs text-primary/70 font-normal">
                    — {ASSOCIATED_TEXT_SOURCES.find(s => s.value === associatedTextSource)?.label?.slice(3, 30)}…
                  </span>
                )}
              </span>
              {showTextOption ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showTextOption && (
              <div className="px-3 pb-3 pt-1 space-y-1.5 bg-muted/20 border-t border-border/40">
                <p className="text-xs text-muted-foreground mb-2">
                  Un bouton apparaîtra dans l'interface de l'appel pour que les participants puissent ouvrir ce texte sans quitter la session.
                </p>
                <button
                  type="button"
                  onClick={() => setAssociatedTextSource('')}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${!associatedTextSource ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
                >
                  Aucun texte associé
                </button>
                {ASSOCIATED_TEXT_SOURCES.map((src) => (
                  <button
                    key={src.value}
                    type="button"
                    onClick={() => setAssociatedTextSource(src.value)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${associatedTextSource === src.value ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'}`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={!title || !date || saving}
            className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/0.3)] rounded-xl py-5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {t('calls.createSession')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ════════════════════════════════════════════
   EDIT SESSION DIALOG
════════════════════════════════════════════ */
const EditSessionDialog = ({ session, onOpenChange, onUpdated, t, dateLocale }: any) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(session.title || '');
  const [description, setDescription] = useState(session.description || '');
  const [sessionType, setSessionType] = useState(session.session_type || 'video');
  const [date, setDate] = useState<Date | undefined>(
    session.scheduled_date ? new Date(session.scheduled_date) : undefined
  );
  const [time, setTime] = useState(session.scheduled_time?.slice(0, 5) || '19:00');
  const [duration, setDuration] = useState(String(session.estimated_duration || 60));
  const [accessType, setAccessType] = useState(session.access_type || 'open');
  const [recurrence, setRecurrence] = useState(session.recurrence || 'once');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(session.thumbnail_url || null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleThumbChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingThumb(true);
    const path = `scheduled/${user?.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('video-flyers').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('video-flyers').getPublicUrl(path);
      setThumbnailUrl(data.publicUrl);
    }
    setUploadingThumb(false);
  };

  const handleSave = async () => {
    if (!title || !date) return;
    setSaving(true);
    const { error } = await (supabase as any).from('scheduled_sessions' as any).update({
      title,
      description: description || null,
      session_type: sessionType,
      scheduled_date: format(date, 'yyyy-MM-dd'),
      scheduled_time: time + ':00',
      estimated_duration: parseInt(duration),
      access_type: accessType,
      recurrence,
      thumbnail_url: thumbnailUrl,
    } as any).eq('id', session.id);
    setSaving(false);
    if (error) {
      toast.error(t('common.error'));
    } else {
      toast.success('Session modifiée');
      onUpdated();
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinzel flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Modifier la session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-foreground">{t('calls.form.title')}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 rounded-lg" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t('calls.form.description')}</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.type')}</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="audio">🎙️ {t('calls.type.audio')}</SelectItem>
                  <SelectItem value="video">📹 {t('calls.type.video')}</SelectItem>
                  <SelectItem value="live">🔴 {t('calls.type.live')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.access')}</label>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">🌐 {t('calls.access.open')}</SelectItem>
                  <SelectItem value="members">🔒 {t('calls.access.members')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.date')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal rounded-lg">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: dateLocale }) : t('calls.form.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d: Date | undefined) => d && setDate(d)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.time')}</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.duration')}</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1h</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2h</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.recurrence')}</label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{t('calls.recurrence.once')}</SelectItem>
                  <SelectItem value="daily">{t('calls.recurrence.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('calls.recurrence.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('calls.recurrence.monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Thumbnail */}
          <div>
            <label className="text-sm font-medium text-foreground">Image / affiche (facultatif)</label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-primary hover:text-primary transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploadingThumb ? 'Chargement…' : thumbnailUrl ? "Changer l'image" : 'Choisir une image'}
                  {uploadingThumb && <Loader2 className="h-3 w-3 animate-spin" />}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbChange} />
              </label>
              {thumbnailUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={thumbnailUrl} alt="thumbnail" className="h-14 w-24 object-cover rounded-lg border border-border/60" />
                  <button onClick={() => setThumbnailUrl(null)} className="text-xs text-destructive hover:underline">Supprimer</button>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!title || !date || saving}
            className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-xl py-5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
            Enregistrer les modifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallsAndLives;
