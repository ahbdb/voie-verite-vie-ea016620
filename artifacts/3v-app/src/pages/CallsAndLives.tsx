import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, isToday, isBefore, addMinutes, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { fr, enUS, it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { sendCallJoinNotification } from '@/lib/notification-service';

/** Build the public share URL pointing to the invitation page on this app. */
const buildShareUrl = (session: ScheduledSession) => {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://voie-verite-vie.netlify.app';
  return `${origin}/invite/${session.id}`;
};

/** Format a scheduled date/time as "HH:mm GMT" (treated as UTC). */
const formatGmtTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m} GMT`;
};
import {
  Radio, Video, Mic, Calendar as CalendarIcon, Clock, Users, Play,
  Bell, Share2, Download, Settings, Trash2, Edit2, Plus, Eye,
  PhoneCall, VideoIcon, Loader2, QrCode, Link2, Copy, ExternalLink,
  Heart, ThumbsUp, Flame, Laugh, Bird, HandMetal, Sparkles, Crown, X
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
    const statusEmoji = session.status === 'live' ? '🔴 EN DIRECT' : '📅';
    const text = `${statusEmoji} ${session.title}\n${formatScheduledFull(session)}\n\n${link}`;
    // Try native share first (mobile / WhatsApp / etc.)
    if (navigator.share) {
      try {
        await navigator.share({ title: session.title, text, url: link });
        return;
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('calls.linkCopied'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const formatScheduledFull = (session: ScheduledSession) => {
    const d = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
    return `${format(d, 'PPP', { locale: dateLocale })} • ${formatGmtTime(session.scheduled_time)}`;
  };

  const joinSession = (session: ScheduledSession) => {
    if (session.video_room_id) {
      navigate(`/meeting/${session.video_room_id}`);
    } else {
      toast.info(t('calls.sessionNotStarted'));
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'live': return <Radio className="h-4 w-4" />;
      default: return <Video className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500 text-white';
      case 'scheduled': return 'bg-blue-500 text-white';
      case 'ended': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-muted text-muted-foreground line-through';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('calls.pageTitle')} — Voie Vérité Vie</title>
        <meta name="description" content={t('calls.pageDescription')} />
      </Helmet>
      <Navigation />

      {/* Hero header — cathedral aesthetic */}
      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral">
        <div className="absolute inset-0 bg-gradient-stained opacity-60 pointer-events-none" />
        <div className="absolute inset-0 stained-shimmer opacity-40 pointer-events-none" />
        <div className="relative container mx-auto px-4 pt-28 pb-12 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <Sparkles className="h-3.5 w-3.5 text-cathedral-gold" />
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">
              {t('calls.heroBadge', 'Communauté en direct')}
            </span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
            {t('calls.pageTitle')}
          </h1>
          <div className="cathedral-line w-32 h-px mx-auto my-5" />
          <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {t('calls.pageDescription')}
          </p>

          {liveSessions.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/90 text-accent-foreground shadow-[0_0_30px_hsl(var(--accent)/0.5)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest">
                {liveSessions.length} {t('calls.liveNow')}
              </span>
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
            <TabsTrigger value="live" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary">
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
            <TabsTrigger value="scheduled" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.scheduled')}</span>
              <span className="sm:hidden">{t('calls.tabs.scheduledShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="recordings" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary">
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.recordings')}</span>
              <span className="sm:hidden">{t('calls.tabs.recordingsShort')}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary">
                <Crown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('calls.tabs.admin')}</span>
                <span className="sm:hidden">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1: LIVE NOW */}
          <TabsContent value="live" className="mt-6">
            <LiveNowTab
              sessions={liveSessions}
              isAdmin={isAdmin}
              onJoin={joinSession}
              onRefresh={fetchSessions}
              t={t}
              dateLocale={dateLocale}
            />
          </TabsContent>

          {/* TAB 2: SCHEDULED */}
          <TabsContent value="scheduled" className="mt-6">
            <ScheduledTab
              sessions={scheduledSessions}
              isAdmin={isAdmin}
              myReminders={myReminders}
              onToggleReminder={toggleReminder}
              onCopyLink={copyShareLink}
              onJoin={joinSession}
              onScheduleNew={() => setShowScheduleDialog(true)}
              t={t}
              dateLocale={dateLocale}
            />
          </TabsContent>

          {/* TAB 3: RECORDINGS */}
          <TabsContent value="recordings" className="mt-6">
            <RecordingsTab
              sessions={endedSessions}
              isAdmin={isAdmin}
              t={t}
              dateLocale={dateLocale}
              onRefresh={fetchSessions}
            />
          </TabsContent>

          {/* TAB 4: ADMIN */}
          {isAdmin && (
            <TabsContent value="admin" className="mt-6">
              <AdminControlTab
                sessions={sessions}
                onRefresh={fetchSessions}
                t={t}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Schedule Dialog */}
      <ScheduleSessionDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onCreated={() => { fetchSessions(); setShowScheduleDialog(false); }}
        t={t}
        dateLocale={dateLocale}
      />
    </div>
  );
};

/* ─── LIVE NOW TAB ─── */
const LiveNowTab = ({ sessions, isAdmin, onJoin, t, dateLocale, onRefresh }: any) => {
  const { user } = useAuth();
  const [prayerCount, setPrayerCount] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [starting, setStarting] = useState(false);
  const [sessionToEnd, setSessionToEnd] = useState<ScheduledSession | null>(null);

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
      // Create a video room first
      const { data: room, error: roomError } = await supabase
        .from('video_rooms')
        .insert({
          title: type === 'audio' ? t('calls.quickAudioCall') : type === 'video' ? t('calls.quickVideoCall') : t('calls.quickLiveStream'),
          room_type: type === 'live' ? 'broadcast' : type,
          status: 'active',
          created_by: user.id,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (roomError) throw roomError;

      // Create a scheduled_session linked to this room
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
        } as any);

      if (sessionError) throw sessionError;

      // Fire rich push notification to all subscribers (WhatsApp-style)
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

      // Also fire a local notification for users currently using the app
      const sessionTitle = type === 'audio'
        ? t('calls.quickAudioCall')
        : type === 'video' ? t('calls.quickVideoCall') : t('calls.quickLiveStream');
      sendCallJoinNotification(
        sessionTitle,
        room.id,
        user.user_metadata?.full_name || user.email
      ).catch(() => {});

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
      await supabase.from('scheduled_sessions' as any)
        .update({ status: 'ended' } as any)
        .eq('id', session.id);
      if (session.video_room_id) {
        await supabase.from('video_rooms')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', session.video_room_id);
      }
      toast.success(t('calls.sessionEnded'));
      onRefresh();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <>
    {/* End-session confirmation dialog */}
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
          <AlertDialogAction
            onClick={() => { if (sessionToEnd) { void endSession(sessionToEnd); setSessionToEnd(null); } }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Terminer la session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div className="space-y-6">
      {/* Admin: Start buttons when no live session */}
      {isAdmin && sessions.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-cathedral-gold/30 bg-gradient-to-br from-card via-card to-primary/5 p-8 text-center">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.4)] mb-4">
              <Radio className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="font-cinzel text-2xl font-bold text-foreground mb-2">{t('calls.startNewSession')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{t('calls.startNewSessionDesc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              <button
                onClick={() => startSession('audio')}
                disabled={starting}
                className="group relative overflow-hidden rounded-xl border border-border bg-background hover:border-primary/50 transition-all p-5 text-left disabled:opacity-50 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.15)]"
              >
                <Mic className="h-6 w-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-foreground text-sm">{t('calls.startAudio')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('calls.type.audio')}</p>
              </button>
              <button
                onClick={() => startSession('video')}
                disabled={starting}
                className="group relative overflow-hidden rounded-xl border border-border bg-background hover:border-primary/50 transition-all p-5 text-left disabled:opacity-50 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.15)]"
              >
                <Video className="h-6 w-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-foreground text-sm">{t('calls.startVideo')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('calls.type.video')}</p>
              </button>
              <button
                onClick={() => startSession('live')}
                disabled={starting}
                className="group relative overflow-hidden rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 to-background hover:border-accent transition-all p-5 text-left disabled:opacity-50 hover:shadow-[0_8px_30px_hsl(var(--accent)/0.25)]"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <Radio className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                </div>
                <p className="font-semibold text-foreground text-sm">{t('calls.startLive')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('calls.type.live')}</p>
              </button>
            </div>
            {starting && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading', 'Loading...')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No live session message for non-admins */}
      {!isAdmin && sessions.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative h-20 w-20 rounded-full border border-cathedral-gold/30 bg-gradient-to-br from-card to-muted flex items-center justify-center">
              <Radio className="h-9 w-9 text-cathedral-gold/60" />
            </div>
          </div>
          <h3 className="font-cinzel text-2xl font-semibold text-foreground mb-2">{t('calls.noLive')}</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">{t('calls.noLiveDesc')}</p>
          <div className="cathedral-line w-24 h-px mx-auto mt-6 opacity-50" />
        </div>
      )}

      {sessions.map((session: ScheduledSession) => (
        <div key={session.id} className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/5 via-card to-background shadow-[0_10px_40px_-15px_hsl(var(--accent)/0.4)]">
          {/* Floating emojis */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {floatingEmojis.map(e => (
              <span
                key={e.id}
                className="absolute text-3xl"
                style={{
                  left: `${e.x}%`,
                  bottom: 0,
                  animation: 'floatUp 2s ease-out forwards',
                }}
              >
                {e.emoji}
              </span>
            ))}
          </div>

          {/* Live banner */}
          <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="font-bold text-xs uppercase tracking-[0.2em]">
              🔴 {t('calls.liveNow')}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-sm font-medium">
              <Eye className="h-4 w-4" /> {session.viewer_count || 0}
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-foreground mb-2">{session.title}</h2>
            {session.description && (
              <p className="text-muted-foreground text-sm mb-5 leading-relaxed">{session.description}</p>
            )}

            <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60">
                {session.session_type === 'audio' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {t(`calls.type.${session.session_type}`)}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60">
                <Clock className="h-4 w-4" /> {session.estimated_duration} min
              </span>
            </div>

            {/* Join button */}
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-bold text-base py-6 mb-5 shadow-[0_8px_30px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_hsl(var(--primary)/0.5)] transition-all"
              onClick={() => onJoin(session)}
            >
              ➡️ {t('calls.joinNow')}
            </Button>

            {/* Prayer counter */}
            <div className="flex items-center justify-center gap-2 mb-5 text-lg">
              <button
                onClick={() => sendReaction('🙏')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all hover:scale-105"
              >
                <span className="text-2xl">🙏</span>
                <span className="font-bold text-foreground">{prayerCount}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('calls.prayers', 'prières')}</span>
              </button>
            </div>

            {/* Emoji reactions */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {EMOJI_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl p-2.5 rounded-full hover:bg-muted/50 transition-transform hover:scale-125 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Admin controls */}
            {isAdmin && (
              <div className="mt-6 pt-5 border-t border-border/60">
                <p className="text-xs text-cathedral-gold uppercase tracking-[0.2em] mb-3 font-semibold flex items-center gap-1.5">
                  <Crown className="h-3 w-3" /> {t('calls.adminControls')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="destructive" size="sm" onClick={() => setSessionToEnd(session)} className="gap-1.5">
                    <X className="h-3.5 w-3.5" /> {t('calls.endSession')}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
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

/* ─── SCHEDULED TAB ─── */
const ScheduledTab = ({ sessions, isAdmin, myReminders, onToggleReminder, onCopyLink, onJoin, onScheduleNew, t, dateLocale }: any) => {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="font-cinzel text-xl font-semibold text-foreground">{t('calls.tabs.scheduled')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} {t('calls.upcomingSessions', 'sessions à venir')}</p>
          </div>
          <Button onClick={onScheduleNew} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_25px_hsl(var(--primary)/0.45)]">
            <Plus className="h-4 w-4 mr-1.5" /> {t('calls.scheduleNew')}
          </Button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative h-20 w-20 rounded-full border border-cathedral-gold/30 bg-gradient-to-br from-card to-muted flex items-center justify-center">
              <CalendarIcon className="h-9 w-9 text-cathedral-gold/60" />
            </div>
          </div>
          <h3 className="font-cinzel text-2xl font-semibold text-foreground mb-2">{t('calls.noScheduled')}</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">{t('calls.noScheduledDesc')}</p>
          <div className="cathedral-line w-24 h-px mx-auto mt-6 opacity-50" />
        </div>
      ) : (
        sessions.map((session: ScheduledSession) => {
          const sessionDateTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
          const now = new Date();
          const minutesUntil = differenceInMinutes(sessionDateTime, now);
          const isStartingSoon = minutesUntil > 0 && minutesUntil <= 60;
          const isStartingNow = minutesUntil <= 5 && minutesUntil >= -5;

          return (
            <div
              key={session.id}
              className={cn(
                "group rounded-2xl border p-5 sm:p-6 transition-all hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.2)]",
                isStartingNow ? "border-accent/50 bg-gradient-to-br from-accent/5 to-card shadow-[0_0_25px_-5px_hsl(var(--accent)/0.4)]" :
                isStartingSoon ? "border-cathedral-gold/40 bg-gradient-to-br from-primary/5 to-card" :
                "border-border/70 bg-card hover:border-cathedral-gold/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isStartingNow && (
                      <Badge className="bg-accent text-accent-foreground text-xs animate-pulse">
                        🔴 {t('calls.startingNow')}
                      </Badge>
                    )}
                    {isStartingSoon && !isStartingNow && (
                      <Badge variant="outline" className="border-cathedral-gold text-cathedral-gold text-xs">
                        ⏰ {minutesUntil} min
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs flex items-center gap-1 border-border">
                      {getSessionTypeIconStatic(session.session_type)}
                      {t(`calls.type.${session.session_type}`)}
                    </Badge>
                  </div>

                  <h3 className="font-cinzel font-bold text-foreground text-lg sm:text-xl mt-1">{session.title}</h3>

                  {session.description && (
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{session.description}</p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(new Date(session.scheduled_date), 'PPP', { locale: dateLocale })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
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

                  {/* Tags */}
                  {session.tags && session.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {session.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/40 flex-wrap">
                {isStartingNow ? (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_4px_15px_hsl(var(--primary)/0.3)]"
                    onClick={() => onJoin(session)}
                  >
                    ➡️ {t('calls.joinNow')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={myReminders.has(session.id) ? "secondary" : "outline"}
                    onClick={() => onToggleReminder(session.id)}
                  >
                    <Bell className={cn("h-4 w-4 mr-1.5", myReminders.has(session.id) && "fill-current")} />
                    {myReminders.has(session.id) ? t('calls.reminded') : t('calls.remindMe')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onCopyLink(session)}>
                  <Share2 className="h-4 w-4 mr-1.5" /> {t('calls.share')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  // Times are stored as GMT/UTC → use Z suffix so calendar handles tz correctly
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
          );
        })
      )}
    </div>
  );
};

function getSessionTypeIconStatic(type: string) {
  switch (type) {
    case 'audio': return <Mic className="h-3 w-3" />;
    case 'video': return <Video className="h-3 w-3" />;
    case 'live': return <Radio className="h-3 w-3" />;
    default: return <Video className="h-3 w-3" />;
  }
}

/* ─── RECORDINGS TAB ─── */
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
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative h-20 w-20 rounded-full border border-cathedral-gold/30 bg-gradient-to-br from-card to-muted flex items-center justify-center">
            <Play className="h-9 w-9 text-cathedral-gold/60" />
          </div>
        </div>
        <h3 className="font-cinzel text-2xl font-semibold text-foreground mb-2">{t('calls.noRecordings')}</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">{t('calls.noRecordingsDesc')}</p>
        <div className="cathedral-line w-24 h-px mx-auto mt-6 opacity-50" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {sessions.map((session: ScheduledSession) => (
        <div key={session.id} className="rounded-2xl border border-border/70 bg-card overflow-hidden group hover:border-cathedral-gold/40 hover:shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.25)] transition-all">
          {/* Thumbnail */}
          <div className="aspect-video bg-gradient-to-br from-cathedral-navy to-muted flex items-center justify-center relative overflow-hidden">
            {session.thumbnail_url ? (
              <img src={session.thumbnail_url} alt={session.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="flex flex-col items-center text-cathedral-gold/40">
                {session.session_type === 'audio' ? <Mic className="h-14 w-14" /> : <Video className="h-14 w-14" />}
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-2 py-0.5 rounded backdrop-blur-sm font-medium">
              {session.estimated_duration} min
            </div>
            {session.recording_url && (
              <div className="absolute inset-0 bg-cathedral-navy/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.5)]">
                  <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
                </div>
              </div>
            )}
          </div>

          <div className="p-5">
            <h3 className="font-cinzel font-bold text-foreground line-clamp-1 text-base">{session.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>{format(new Date(session.scheduled_date), 'PP', { locale: dateLocale })}</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {session.viewer_count || 0}</span>
              <Badge variant="outline" className="text-xs">
                {session.session_type === 'audio' ? '🎙️' : '📹'} {t(`calls.type.${session.session_type}`)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
              {session.recording_url ? (
                <>
                  <Button size="sm" variant="outline" asChild>
                    <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                      <Play className="h-3.5 w-3.5 mr-1.5" /> {t('calls.play')}
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={session.recording_url} download>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> {t('calls.download')}
                    </a>
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">{t('calls.noRecordingFile')}</span>
              )}
              {isAdmin && (
                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => deleteRecording(session.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── ADMIN CONTROL TAB ─── */
const AdminControlTab = ({ sessions, onRefresh, t }: any) => {
  const totalSessions = sessions.length;
  const liveSessions = sessions.filter((s: any) => s.status === 'live').length;
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
          <Sparkles className="h-3.5 w-3.5" /> {t('calls.admin.analytics')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card to-primary/5 p-5 text-center hover:border-cathedral-gold/40 transition-all">
            <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
            <p className="font-cinzel text-3xl sm:text-4xl font-bold text-foreground relative">{totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider relative">{t('calls.admin.totalSessions')}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-5 text-center">
            <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-accent/15 blur-2xl" />
            <p className="font-cinzel text-3xl sm:text-4xl font-bold text-accent relative">{liveSessions}</p>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider relative">{t('calls.admin.activeLive')}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card to-cathedral-gold/5 p-5 text-center hover:border-cathedral-gold/40 transition-all">
            <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-cathedral-gold/10 blur-2xl" />
            <p className="font-cinzel text-3xl sm:text-4xl font-bold text-cathedral-gold relative">{totalViewers}</p>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider relative">{t('calls.admin.totalViewers')}</p>
          </div>
        </div>
      </div>

      <div className="cathedral-line h-px w-full opacity-40" />

      {/* Session management */}
      <div>
        <h3 className="text-xs font-semibold text-cathedral-gold uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" /> {t('calls.admin.manageSessions')}
        </h3>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">{t('calls.admin.noSessions')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session: ScheduledSession) => (
              <div key={session.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/70 bg-card hover:border-cathedral-gold/30 hover:bg-muted/30 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(session.scheduled_date), 'PP')} • {formatGmtTime(session.scheduled_time)}
                  </p>
                </div>
                <Badge className={cn("text-xs",
                  session.status === 'live' ? 'bg-accent text-accent-foreground' :
                  session.status === 'scheduled' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {t(`calls.status.${session.status}`)}
                </Badge>
                <div className="flex gap-1">
                  {session.status === 'scheduled' && (
                    <Button size="sm" variant="ghost" onClick={() => cancelSession(session.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSession(session.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── SCHEDULE DIALOG ─── */
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

  const handleCreate = async () => {
    if (!title || !date || !user) return;
    setSaving(true);

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
      setTitle(''); setDescription(''); setDate(undefined);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>➕ {t('calls.scheduleNew')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium text-foreground">{t('calls.form.title')}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('calls.form.titlePlaceholder')} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">{t('calls.form.description')}</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.type')}</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: dateLocale }) : t('calls.form.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.time')}</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('calls.form.duration')}</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder={t('calls.form.tagsPlaceholder')} />
          </div>

          <Button onClick={handleCreate} disabled={!title || !date || saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {t('calls.createSession')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallsAndLives;
