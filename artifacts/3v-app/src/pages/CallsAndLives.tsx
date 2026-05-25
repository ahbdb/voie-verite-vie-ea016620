import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, differenceInSeconds, differenceInMinutes, isToday } from 'date-fns';
import { fr, enUS, it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { sendCallJoinNotification } from '@/lib/notification-service';
import { useCallSession } from '@/contexts/CallSessionContext';
import {
  Radio, Video, Mic, Calendar as CalendarIcon, Clock, Users, Play,
  Bell, Share2, Download, Trash2, Plus, Eye, Loader2, Crown,
  BookOpen, ChevronDown, ChevronUp, Phone, PhoneCall, Link2,
  Activity, CheckCircle2, PhoneOff, Sparkles, WifiOff,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

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

const EMOJI_REACTIONS = ['🙏', '❤️', '🔥', '👏', '😂', '🕊️'];

const ASSOCIATED_TEXT_SOURCES = [
  { value: 'liturgy', label: '📖 Textes liturgiques du jour', href: '/messe-office' },
  { value: 'biblical', label: '📚 Lecture biblique annuelle', href: '/biblical-reading' },
  { value: 'novena', label: '🕯️ Neuvaine du moment', href: '/neuvaines' },
  { value: 'careme', label: '✝️ Réflexion du Carême', href: '/careme' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTypeConfig(type: string) {
  switch (type) {
    case 'audio': return { label: 'Audio', emoji: '🎙️', icon: <Mic className="h-full w-full" />, color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/30' };
    case 'live':  return { label: 'Live',  emoji: '🔴',  icon: <Radio className="h-full w-full" />, color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30' };
    default:      return { label: 'Vidéo', emoji: '📹',  icon: <Video className="h-full w-full" />, color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30' };
  }
}

function fmtTime(timeStr: string) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m} GMT`;
}

function buildShareUrl(s: ScheduledSession) {
  const p = new URLSearchParams({ session: s.id, title: s.title, date: s.scheduled_date, time: s.scheduled_time, type: s.session_type });
  return `https://voie-verite-vie.netlify.app/calls-lives?${p}`;
}

// ── Countdown ─────────────────────────────────────────────────────────────────

const Countdown = ({ targetDate, targetTime }: { targetDate: string; targetTime: string }) => {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const calc = () => setSecs(Math.max(0, differenceInSeconds(new Date(`${targetDate}T${targetTime}`), new Date())));
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate, targetTime]);
  if (secs <= 0) return null;
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold tabular-nums text-cathedral-gold">
      {h > 0 && <><span>{String(h).padStart(2,'0')}</span><span className="opacity-50">h</span></>}
      <span>{String(m).padStart(2,'0')}</span><span className="opacity-50">m</span>
      <span>{String(s).padStart(2,'0')}</span><span className="opacity-50">s</span>
    </span>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const CallsAndLives = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { primeAudioPlayback } = useCallSession();
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReminders, setMyReminders] = useState<Set<string>>(new Set());
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [startingType, setStartingType] = useState<string | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<{id:number;emoji:string;x:number}[]>([]);
  const [sessionToEnd, setSessionToEnd] = useState<ScheduledSession | null>(null);

  const dateLocale = i18n.language === 'fr' ? fr : i18n.language === 'it' ? it : enUS;

  const liveSessions = useMemo(() => sessions.filter(s => s.status === 'live'), [sessions]);
  const upcoming     = useMemo(() => sessions.filter(s => s.status === 'scheduled').sort((a,b) => `${a.scheduled_date}${a.scheduled_time}`.localeCompare(`${b.scheduled_date}${b.scheduled_time}`)), [sessions]);
  const recordings   = useMemo(() => sessions.filter(s => s.status === 'ended'), [sessions]);

  useEffect(() => {
    fetchSessions();
    if (user) fetchReminders();
    const channel = supabase.channel('calls-lives-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_sessions' }, fetchSessions)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchSessions = async () => {
    const { data, error } = await supabase.from('scheduled_sessions' as any).select('*').order('scheduled_date', { ascending: true });
    if (!error && data) setSessions(data as any);
    setLoading(false);
  };

  const fetchReminders = async () => {
    if (!user) return;
    const { data } = await supabase.from('session_reminders' as any).select('session_id').eq('user_id', user.id);
    if (data) setMyReminders(new Set((data as any[]).map((r: any) => r.session_id)));
  };

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

  const shareSession = async (session: ScheduledSession) => {
    const link = buildShareUrl(session);
    if (navigator.share) {
      try { await navigator.share({ title: session.title, url: link }); return; } catch {}
    }
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.success(t('calls.linkCopied'));
  };

  const joinSession = (session: ScheduledSession) => {
    if (session.video_room_id) {
      primeAudioPlayback();
      navigate(`/meeting/${session.video_room_id}`);
    } else {
      toast.info(t('calls.sessionNotStarted'));
    }
  };

  // Direct start — no lobby. getUserMedia is called by AdminVideoRoom after navigation,
  // which is a direct user gesture and works correctly on all PWAs.
  const startQuickCall = async (type: 'audio' | 'video' | 'live') => {
    if (!user) { toast.error(t('calls.loginRequired')); return; }
    setStartingType(type);
    try {
      const title = type === 'audio' ? t('calls.quickAudioCall') : type === 'video' ? t('calls.quickVideoCall') : t('calls.quickLiveStream');
      const { data: room, error: roomErr } = await supabase.from('video_rooms').insert({
        title, room_type: type === 'live' ? 'broadcast' : type, status: 'active',
        created_by: user.id, started_at: new Date().toISOString(),
      }).select('id').single();
      if (roomErr) throw roomErr;

      if (isAdmin) {
        await supabase.from('scheduled_sessions' as any).insert({
          title, session_type: type,
          scheduled_date: format(new Date(), 'yyyy-MM-dd'),
          scheduled_time: format(new Date(), 'HH:mm:ss'),
          estimated_duration: 60, access_type: 'open', recurrence: 'once',
          status: 'live', created_by: user.id, video_room_id: room.id,
        } as any);
        fetchSessions();
      }

      sendCallJoinNotification(title, room.id, user.name ?? user.email ?? undefined).catch(() => {});
      toast.success(t('calls.sessionStarted'));
      primeAudioPlayback();
      navigate(`/meeting/${room.id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setStartingType(null);
    }
  };

  const joinByCode = () => {
    const code = joinCode.trim();
    if (!code) return;
    primeAudioPlayback();
    navigate(`/meeting/${code}`);
  };

  const sendReaction = (emoji: string) => {
    const id = Date.now();
    setFloatingEmojis(prev => [...prev, { id, emoji, x: 10 + Math.random() * 80 }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2200);
  };

  const endSession = async (session: ScheduledSession) => {
    await supabase.from('scheduled_sessions' as any).update({ status: 'ended' } as any).eq('id', session.id);
    if (session.video_room_id) {
      await supabase.from('video_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', session.video_room_id);
    }
    toast.success(t('calls.sessionEnded'));
    fetchSessions();
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('calls.pageTitle')} — Voie Vérité Vie</title>
        <meta name="description" content={t('calls.pageDescription')} />
      </Helmet>
      <Navigation />

      {/* ── Hero ── */}
      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-40 pointer-events-none" />
        {liveSessions.length > 0 && (
          <>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full border border-red-500/10 animate-ping" style={{ animationDuration: '3s' }} />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: '2.2s' }} />
          </>
        )}
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <PhoneCall className="h-3.5 w-3.5 text-cathedral-gold" />
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">Communauté en direct</span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-3">{t('calls.pageTitle')}</h1>
          <div className="cathedral-line w-24 h-px mx-auto my-4" />
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">{t('calls.pageDescription')}</p>
          {liveSessions.length > 0 ? (
            <div className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-red-500/90 text-white shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-pulse">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"/>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"/>
              </span>
              <span className="text-sm font-black uppercase tracking-widest">{liveSessions.length} session{liveSessions.length > 1 ? 's' : ''} en direct</span>
            </div>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 bg-white/5 text-white/50 text-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Aucun live en ce moment
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* ── Quick start ── */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4">Démarrer</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

            {/* Audio */}
            <button
              onClick={() => startQuickCall('audio')}
              disabled={!!startingType}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/15 hover:border-violet-500/60 transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {startingType === 'audio'
                ? <Loader2 className="h-7 w-7 text-violet-400 animate-spin" />
                : <Mic className="h-7 w-7 text-violet-400 group-hover:scale-110 transition-transform" />}
              <div className="text-center">
                <span className="text-xs font-semibold text-foreground block">{t('calls.startAudio')}</span>
                <span className="text-[10px] text-muted-foreground">Voix uniquement</span>
              </div>
            </button>

            {/* Video */}
            <button
              onClick={() => startQuickCall('video')}
              disabled={!!startingType}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 hover:border-blue-500/60 transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {startingType === 'video'
                ? <Loader2 className="h-7 w-7 text-blue-400 animate-spin" />
                : <Video className="h-7 w-7 text-blue-400 group-hover:scale-110 transition-transform" />}
              <div className="text-center">
                <span className="text-xs font-semibold text-foreground block">{t('calls.startVideo')}</span>
                <span className="text-[10px] text-muted-foreground">Caméra + micro</span>
              </div>
            </button>

            {/* Join by code */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/60 transition-all active:scale-[0.97]">
                  <Link2 className="h-7 w-7 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <span className="text-xs font-semibold text-foreground block">{t('calls.joinByCode', 'Rejoindre')}</span>
                    <span className="text-[10px] text-muted-foreground">Par code ou lien</span>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl pb-10">
                <SheetHeader className="mb-5">
                  <SheetTitle className="font-cinzel text-xl">Rejoindre un appel</SheetTitle>
                </SheetHeader>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <Input
                    placeholder={t('calls.roomCodePlaceholder', 'Code ou lien de la réunion')}
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && joinByCode()}
                    className="rounded-xl text-base h-12"
                    autoFocus
                  />
                  <Button onClick={joinByCode} disabled={!joinCode.trim()} className="rounded-xl h-12 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Live (admin) or Schedule (user) */}
            {isAdmin ? (
              <button
                onClick={() => startQuickCall('live')}
                disabled={!!startingType}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-red-500/40 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/60 transition-all active:scale-[0.97] disabled:opacity-60"
              >
                {startingType === 'live'
                  ? <Loader2 className="h-7 w-7 text-red-400 animate-spin" />
                  : <Radio className="h-7 w-7 text-red-400 group-hover:scale-110 transition-transform" />}
                <div className="text-center">
                  <span className="text-xs font-semibold text-foreground block">{t('calls.startLive')}</span>
                  <span className="text-[10px] text-muted-foreground">Live public</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => user ? setShowScheduleDialog(true) : toast.error(t('calls.loginRequired'))}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-cathedral-gold/30 bg-cathedral-gold/5 hover:bg-cathedral-gold/15 hover:border-cathedral-gold/60 transition-all active:scale-[0.97]"
              >
                <CalendarIcon className="h-7 w-7 text-cathedral-gold group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <span className="text-xs font-semibold text-foreground block">{t('calls.scheduleNew')}</span>
                  <span className="text-[10px] text-muted-foreground">Session prévue</span>
                </div>
              </button>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowScheduleDialog(true)}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" /> {t('calls.scheduleNew')}
            </button>
          )}
        </section>

        {/* ── Live now ── */}
        {liveSessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/>
              </span>
              {t('calls.liveNow')}
            </h2>

            <AlertDialog open={!!sessionToEnd} onOpenChange={open => !open && setSessionToEnd(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminer la session ?</AlertDialogTitle>
                  <AlertDialogDescription>La session « {sessionToEnd?.title} » sera terminée et les participants déconnectés.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if (sessionToEnd) { endSession(sessionToEnd); setSessionToEnd(null); } }} className="bg-red-600 hover:bg-red-700 text-white">Terminer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="space-y-4">
              {liveSessions.map(session => {
                const cfg = getTypeConfig(session.session_type);
                return (
                  <div key={session.id} className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/8 via-card to-background shadow-[0_0_50px_-15px_rgba(239,68,68,0.4)]">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                      {floatingEmojis.map(e => (
                        <span key={e.id} className="absolute text-3xl" style={{ left:`${e.x}%`, bottom:0, animation:'floatUp 2.2s ease-out forwards' }}>{e.emoji}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3 bg-red-500/90 text-white">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"/>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"/>
                      </span>
                      <span className="font-black text-sm uppercase tracking-widest">EN DIRECT</span>
                      <span className="ml-auto flex items-center gap-1.5 text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                        <Eye className="h-3.5 w-3.5"/> {session.viewer_count || 0}
                      </span>
                    </div>
                    <div className="p-5 sm:p-6">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium mb-3", cfg.bg, cfg.color, cfg.border)}>
                        <span className="h-3 w-3">{cfg.icon}</span>{cfg.label}
                      </span>
                      <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-foreground mb-1">{session.title}</h3>
                      {session.description && <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{session.description}</p>}
                      <Button size="lg" onClick={() => joinSession(session)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base py-5 mb-4 shadow-[0_6px_25px_rgba(239,68,68,0.4)]">
                        <Phone className="h-5 w-5 mr-2 fill-white" /> Rejoindre maintenant
                      </Button>
                      <div className="flex items-center gap-2 flex-wrap">
                        {EMOJI_REACTIONS.map(emoji => (
                          <button key={emoji} onClick={() => sendReaction(emoji)} className="text-xl p-2 rounded-full hover:bg-muted/70 transition-transform hover:scale-125 active:scale-90">{emoji}</button>
                        ))}
                      </div>
                      {isAdmin && (
                        <div className="mt-4 pt-4 border-t border-border/50 flex gap-2 flex-wrap">
                          <Button size="sm" variant="destructive" onClick={() => setSessionToEnd(session)} className="rounded-lg gap-1.5">
                            <PhoneOff className="h-3.5 w-3.5" /> Terminer
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => shareSession(session)} className="rounded-lg gap-1.5">
                            <Share2 className="h-3.5 w-3.5" /> Partager
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Upcoming ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">{t('calls.tabs.scheduled')} · {upcoming.length}</h2>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowScheduleDialog(true)} className="rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 gap-1.5 font-semibold">
                <Plus className="h-3.5 w-3.5" /> {t('calls.scheduleNew')}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-14 rounded-2xl border border-dashed border-border/50">
              <CalendarIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('calls.noScheduled')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(session => {
                const dt = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
                const mins = differenceInMinutes(dt, new Date());
                const soon = mins > 0 && mins <= 60;
                const now  = mins <= 5 && mins >= -5;
                const cfg  = getTypeConfig(session.session_type);
                return (
                  <div key={session.id} className={cn(
                    "relative rounded-2xl border overflow-hidden transition-all",
                    now  ? "border-red-500/50 bg-red-500/5 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]" :
                    soon ? "border-cathedral-gold/40 bg-cathedral-gold/5" :
                           "border-border/60 bg-card hover:border-primary/30"
                  )}>
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", cfg.bg)} />
                    <div className="pl-5 pr-4 py-4 sm:py-5">
                      <div className="flex items-start gap-3">
                        <div className="hidden sm:flex flex-col items-center justify-center shrink-0 w-12 h-12 rounded-xl border border-border/60 bg-muted/40">
                          <span className="text-lg font-black font-cinzel text-foreground leading-none">{format(new Date(session.scheduled_date), 'd')}</span>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{format(new Date(session.scheduled_date), 'MMM', { locale: dateLocale })}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            {now && <Badge className="bg-red-500 text-white text-[10px] animate-pulse">Commence maintenant</Badge>}
                            {soon && !now && <Badge variant="outline" className="border-cathedral-gold/50 text-cathedral-gold bg-cathedral-gold/10 text-[10px] gap-1"><Countdown targetDate={session.scheduled_date} targetTime={session.scheduled_time}/></Badge>}
                            {isToday(new Date(session.scheduled_date)) && !soon && !now && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Aujourd'hui</Badge>}
                            <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium", cfg.bg, cfg.color, cfg.border)}>
                              <span className="h-2.5 w-2.5">{cfg.icon}</span>{cfg.label}
                            </span>
                          </div>
                          <h3 className="font-cinzel font-bold text-foreground text-base leading-snug truncate">{session.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{fmtTime(session.scheduled_time)}</span>
                            {session.estimated_duration && <span>⏱ {session.estimated_duration} min</span>}
                            {session.recurrence !== 'once' && <span>🔁 {t(`calls.recurrence.${session.recurrence}`)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40 flex-wrap">
                        {now ? (
                          <Button size="sm" onClick={() => joinSession(session)} className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5">
                            <Phone className="h-3.5 w-3.5 fill-white" /> Rejoindre
                          </Button>
                        ) : (
                          <Button size="sm" variant={myReminders.has(session.id) ? "secondary" : "outline"} onClick={() => toggleReminder(session.id)} className="rounded-lg gap-1.5">
                            <Bell className={cn("h-3.5 w-3.5", myReminders.has(session.id) && "fill-current")} />
                            {myReminders.has(session.id) ? t('calls.reminded') : t('calls.remindMe')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => shareSession(session)} className="rounded-lg gap-1.5">
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => {
                          const start = `${session.scheduled_date.replace(/-/g,'')}T${session.scheduled_time.replace(/:/g,'').slice(0,6)}Z`;
                          const end = new Date(`${session.scheduled_date}T${session.scheduled_time}Z`);
                          end.setMinutes(end.getMinutes() + (session.estimated_duration || 60));
                          const endStr = end.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
                          window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${start}/${endStr}`, '_blank');
                        }}>
                          <CalendarIcon className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="rounded-lg text-destructive ml-auto" onClick={async () => {
                            await supabase.from('scheduled_sessions' as any).delete().eq('id', session.id);
                            fetchSessions();
                            toast.success(t('calls.sessionDeleted'));
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── How it works (empty state) ── */}
        {!loading && sessions.length === 0 && (
          <section className="rounded-2xl border border-border/40 bg-muted/20 p-6">
            <h2 className="font-cinzel text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Comment ça marche
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: '🎙️', title: 'Démarrez un appel', desc: 'Cliquez sur Audio ou Vidéo pour ouvrir un salon immédiat' },
                { icon: '🔗', title: 'Partagez le lien', desc: 'Copiez et envoyez le code ou lien à vos frères et sœurs' },
                { icon: '🙏', title: 'Priez ensemble', desc: 'Retrouvez-vous dans un espace de prière partagé' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="text-center space-y-2">
                  <span className="text-3xl block">{icon}</span>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Recordings ── */}
        {recordings.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4">{t('calls.tabs.recordings')} · {recordings.length}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recordings.map(session => {
                const cfg = getTypeConfig(session.session_type);
                return (
                  <div key={session.id} className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/30 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.2)] transition-all">
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      {session.thumbnail_url ? (
                        <img src={session.thumbnail_url} alt={session.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className={cn("w-full h-full flex items-center justify-center", cfg.bg)}>
                          <span className={cn("h-10 w-10", cfg.color)}>{cfg.icon}</span>
                        </div>
                      )}
                      {session.estimated_duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-bold">{session.estimated_duration} min</div>
                      )}
                      {session.recording_url && (
                        <a href={session.recording_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="h-14 w-14 rounded-full bg-primary/95 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <Play className="h-6 w-6 text-white ml-0.5" fill="currentColor" />
                          </div>
                        </a>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-cinzel font-bold text-foreground text-sm mb-1 line-clamp-1">{session.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3"/>
                        {format(new Date(session.scheduled_date), 'PP', { locale: dateLocale })}
                        <Eye className="h-3 w-3 ml-1"/> {session.viewer_count || 0}
                      </p>
                      <div className="flex items-center gap-2">
                        {session.recording_url ? (
                          <>
                            <Button size="sm" variant="outline" className="rounded-lg flex-1" asChild>
                              <a href={session.recording_url} target="_blank" rel="noopener noreferrer"><Play className="h-3.5 w-3.5 mr-1.5" /> Regarder</a>
                            </Button>
                            <Button size="sm" variant="ghost" className="rounded-lg" asChild>
                              <a href={session.recording_url} download><Download className="h-3.5 w-3.5" /></a>
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                            <WifiOff className="h-3 w-3" /> Pas d'enregistrement
                          </span>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="rounded-lg text-destructive ml-auto" onClick={async () => {
                            await supabase.from('scheduled_sessions' as any).delete().eq('id', session.id);
                            fetchSessions();
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Admin stats ── */}
        {isAdmin && sessions.length > 0 && (
          <section className="rounded-2xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-5">
            <h2 className="text-xs font-semibold text-cathedral-gold uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Tableau de bord
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <Activity className="h-4 w-4 text-blue-400"/>, value: sessions.length, label: 'Total' },
                { icon: <Radio className="h-4 w-4 text-red-400"/>, value: liveSessions.length, label: 'En direct' },
                { icon: <CalendarIcon className="h-4 w-4 text-violet-400"/>, value: upcoming.length, label: 'Planifiées' },
                { icon: <Users className="h-4 w-4 text-cathedral-gold"/>, value: sessions.reduce((s, r) => s + (r.viewer_count || 0), 0), label: 'Spectateurs' },
              ].map(({ icon, value, label }) => (
                <div key={label} className="rounded-xl border border-border/50 bg-card p-4 text-center">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <p className="font-cinzel text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

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

// ── Schedule dialog ────────────────────────────────────────────────────────────

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
  const [assocText, setAssocText] = useState('');

  const handleCreate = async () => {
    if (!title || !date || !user) return;
    setSaving(true);
    const agendaData = assocText
      ? [{ __type: 'associated_text', source: assocText, href: ASSOCIATED_TEXT_SOURCES.find(s => s.value === assocText)?.href || '' }]
      : null;
    const { data: inserted, error } = await (supabase as any).from('scheduled_sessions' as any).insert({
      title, description: description || null, session_type: sessionType,
      scheduled_date: format(date, 'yyyy-MM-dd'), scheduled_time: time + ':00',
      estimated_duration: parseInt(duration), access_type: accessType, recurrence,
      tags: tags ? tags.split(',').map(s => s.trim()) : [],
      created_by: user.id, status: 'scheduled', agenda: agendaData,
    } as any).select('id').maybeSingle();
    setSaving(false);
    if (error) { toast.error(t('common.error')); return; }
    if (inserted?.id) {
      supabase.functions.invoke('notify-session', { body: { session_id: inserted.id, kind: 'scheduled', target: 'all' } }).catch(() => {});
    }
    toast.success(t('calls.sessionCreated'));
    setTitle(''); setDescription(''); setDate(undefined); setAssocText('');
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinzel flex items-center gap-2"><Plus className="h-4 w-4" /> {t('calls.scheduleNew')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium">{t('calls.form.title')}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('calls.form.titlePlaceholder')} className="mt-1 rounded-lg" />
          </div>
          <div>
            <label className="text-sm font-medium">{t('calls.form.description')}</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('calls.form.type')}</label>
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
              <label className="text-sm font-medium">{t('calls.form.access')}</label>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">🌐 {t('calls.access.open')}</SelectItem>
                  <SelectItem value="members">🔒 {t('calls.access.members')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('calls.form.date')}</label>
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
              <label className="text-sm font-medium">{t('calls.form.time')}</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('calls.form.duration')}</label>
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
              <label className="text-sm font-medium">{t('calls.form.recurrence')}</label>
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
            <label className="text-sm font-medium">{t('calls.form.tags')}</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder={t('calls.form.tagsPlaceholder')} className="mt-1 rounded-lg" />
          </div>
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowTextOption(!showTextOption)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors">
              <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Associer un texte liturgique</span>
              {showTextOption ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showTextOption && (
              <div className="px-3 pb-3 pt-1 space-y-1 bg-muted/20 border-t border-border/40">
                {[{ value: '', label: 'Aucun' }, ...ASSOCIATED_TEXT_SOURCES].map(src => (
                  <button key={src.value} type="button" onClick={() => setAssocText(src.value)}
                    className={cn("w-full text-left text-xs px-3 py-2 rounded-lg transition-colors", assocText === src.value ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-muted/50 text-foreground')}>
                    {src.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleCreate} disabled={!title || !date || saving} className="w-full rounded-xl py-5 font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {t('calls.createSession')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallsAndLives;
