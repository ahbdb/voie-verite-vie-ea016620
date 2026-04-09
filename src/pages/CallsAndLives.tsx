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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, isToday, isBefore, addMinutes, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { fr, enUS, it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Radio, Video, Mic, Calendar as CalendarIcon, Clock, Users, Play,
  Bell, Share2, Download, Settings, Trash2, Edit2, Plus, Eye,
  PhoneCall, VideoIcon, Loader2, QrCode, Link2, Copy, ExternalLink,
  Heart, ThumbsUp, Flame, Laugh, Bird, HandMetal
} from 'lucide-react';

const EMOJI_REACTIONS = ['👏', '🙏', '❤️', '🔥', '😂', '🕊️'];

interface ScheduledSession {
  id: string;
  title: string;
  description: string | null;
  session_type: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: number;
  access_type: string;
  recurrence: string;
  share_link: string | null;
  status: string;
  tags: string[];
  agenda: any[];
  video_room_id: string | null;
  recording_url: string | null;
  thumbnail_url: string | null;
  viewer_count: number;
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

  const copyShareLink = (session: ScheduledSession) => {
    const link = `${window.location.origin}/calls-lives?join=${session.id}`;
    navigator.clipboard.writeText(link);
    toast.success(t('calls.linkCopied'));
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

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            📺 {t('calls.pageTitle')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('calls.pageDescription')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "w-full grid gap-1",
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          )}>
            <TabsTrigger value="live" className="flex items-center gap-2 text-xs sm:text-sm">
              <Radio className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.live')}</span>
              <span className="sm:hidden">Live</span>
              {liveSessions.length > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2 text-xs sm:text-sm">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.scheduled')}</span>
              <span className="sm:hidden">{t('calls.tabs.scheduledShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="recordings" className="flex items-center gap-2 text-xs sm:text-sm">
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('calls.tabs.recordings')}</span>
              <span className="sm:hidden">{t('calls.tabs.recordingsShort')}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2 text-xs sm:text-sm">
                <Settings className="h-3.5 w-3.5" />
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
    <div className="space-y-6">
      {/* Admin: Start buttons when no live session */}
      {isAdmin && sessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-primary/30 p-6 text-center space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{t('calls.startNewSession')}</h3>
          <p className="text-sm text-muted-foreground">{t('calls.startNewSessionDesc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => startSession('audio')}
              disabled={starting}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              🎙️ {t('calls.startAudio')}
            </Button>
            <Button
              onClick={() => startSession('video')}
              disabled={starting}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Video className="h-4 w-4 mr-2" />}
              📹 {t('calls.startVideo')}
            </Button>
            <Button
              onClick={() => startSession('live')}
              disabled={starting}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
              🔴 {t('calls.startLive')}
            </Button>
          </div>
        </div>
      )}

      {/* No live session message for non-admins */}
      {!isAdmin && sessions.length === 0 && (
        <div className="text-center py-16">
          <Radio className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('calls.noLive')}</h3>
          <p className="text-muted-foreground text-sm">{t('calls.noLiveDesc')}</p>
        </div>
      )}

      {sessions.map((session: ScheduledSession) => (
        <div key={session.id} className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/5 to-background">
          {/* Floating emojis */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {floatingEmojis.map(e => (
              <span
                key={e.id}
                className="absolute text-2xl"
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
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="font-bold text-sm uppercase tracking-wider">
              🔴 {t('calls.liveNow')}
            </span>
            <span className="ml-auto flex items-center gap-1 text-sm">
              <Eye className="h-4 w-4" /> {session.viewer_count}
            </span>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-2">{session.title}</h2>
            {session.description && (
              <p className="text-muted-foreground text-sm mb-4">{session.description}</p>
            )}

            <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                {session.session_type === 'audio' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {t(`calls.type.${session.session_type}`)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {session.estimated_duration} min
              </span>
            </div>

            {/* Join button */}
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-6 mb-4"
              onClick={() => onJoin(session)}
            >
              ➡️ {t('calls.joinNow')}
            </Button>

            {/* Prayer counter */}
            <div className="flex items-center justify-center gap-2 mb-4 text-lg">
              <button
                onClick={() => sendReaction('🙏')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                🙏 <span className="font-bold">{prayerCount}</span>
              </button>
            </div>

            {/* Emoji reactions */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {EMOJI_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl p-2 rounded-full hover:bg-muted/50 transition-transform hover:scale-125 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Admin controls */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
                  {t('calls.adminControls')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="destructive" size="sm" onClick={() => endSession(session)}>
                    🛑 {t('calls.endSession')}
                  </Button>
                  <Button variant="outline" size="sm">
                    🔇 {t('calls.muteAll')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── SCHEDULED TAB ─── */
const ScheduledTab = ({ sessions, isAdmin, myReminders, onToggleReminder, onCopyLink, onJoin, onScheduleNew, t, dateLocale }: any) => {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button onClick={onScheduleNew} className="w-full sm:w-auto mb-4">
          <Plus className="h-4 w-4 mr-2" /> {t('calls.scheduleNew')}
        </Button>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <CalendarIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('calls.noScheduled')}</h3>
          <p className="text-muted-foreground text-sm">{t('calls.noScheduledDesc')}</p>
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
                "rounded-xl border p-5 transition-all",
                isStartingNow ? "border-red-500/50 bg-red-500/5" :
                isStartingSoon ? "border-orange-500/30 bg-orange-500/5" :
                "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isStartingNow && (
                      <Badge className="bg-red-500 text-white text-xs">
                        🔴 {t('calls.startingNow')}
                      </Badge>
                    )}
                    {isStartingSoon && !isStartingNow && (
                      <Badge variant="outline" className="border-orange-500 text-orange-500 text-xs">
                        ⏰ {minutesUntil} min
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      {getSessionTypeIconStatic(session.session_type)}
                      {t(`calls.type.${session.session_type}`)}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-foreground text-lg">{session.title}</h3>

                  {session.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{session.description}</p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(new Date(session.scheduled_date), 'PPP', { locale: dateLocale })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {session.scheduled_time?.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1">
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
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {isStartingNow ? (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
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
                    <Bell className={cn("h-4 w-4 mr-1", myReminders.has(session.id) && "fill-current")} />
                    {myReminders.has(session.id) ? t('calls.reminded') : t('calls.remindMe')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onCopyLink(session)}>
                  <Share2 className="h-4 w-4 mr-1" /> {t('calls.share')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${session.scheduled_date.replace(/-/g, '')}T${session.scheduled_time.replace(/:/g, '')}00/${session.scheduled_date.replace(/-/g, '')}T${session.scheduled_time.replace(/:/g, '')}00&details=${encodeURIComponent(session.description || '')}`;
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
      <div className="text-center py-16">
        <Play className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('calls.noRecordings')}</h3>
        <p className="text-muted-foreground text-sm">{t('calls.noRecordingsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sessions.map((session: ScheduledSession) => (
        <div key={session.id} className="rounded-xl border border-border bg-card overflow-hidden group">
          {/* Thumbnail */}
          <div className="aspect-video bg-muted flex items-center justify-center relative">
            {session.thumbnail_url ? (
              <img src={session.thumbnail_url} alt={session.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground/40">
                {session.session_type === 'audio' ? <Mic className="h-12 w-12" /> : <Video className="h-12 w-12" />}
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
              {session.estimated_duration} min
            </div>
            {session.recording_url && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="h-12 w-12 text-white" />
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="font-bold text-foreground line-clamp-1">{session.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{format(new Date(session.scheduled_date), 'PP', { locale: dateLocale })}</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {session.viewer_count}</span>
              <Badge variant="outline" className="text-xs">
                {session.session_type === 'audio' ? '🎙️' : '📹'} {t(`calls.type.${session.session_type}`)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {session.recording_url ? (
                <>
                  <Button size="sm" variant="outline" asChild>
                    <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                      <Play className="h-3.5 w-3.5 mr-1" /> {t('calls.play')}
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={session.recording_url} download>
                      <Download className="h-3.5 w-3.5 mr-1" /> {t('calls.download')}
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
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          📊 {t('calls.admin.analytics')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('calls.admin.totalSessions')}</p>
          </div>
          <div className="rounded-xl border border-border p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{liveSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('calls.admin.activeLive')}</p>
          </div>
          <div className="rounded-xl border border-border p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{totalViewers}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('calls.admin.totalViewers')}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Session management */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          🎛️ {t('calls.admin.manageSessions')}
        </h3>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('calls.admin.noSessions')}</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session: ScheduledSession) => (
              <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(session.scheduled_date), 'PP')} • {session.scheduled_time?.slice(0, 5)}
                  </p>
                </div>
                <Badge className={cn("text-xs", 
                  session.status === 'live' ? 'bg-red-500' : 
                  session.status === 'scheduled' ? 'bg-blue-500' : 'bg-muted text-muted-foreground'
                )}>
                  {t(`calls.status.${session.status}`)}
                </Badge>
                <div className="flex gap-1">
                  {session.status === 'scheduled' && (
                    <Button size="sm" variant="ghost" onClick={() => cancelSession(session.id)}>
                      ❌
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

    const { error } = await supabase.from('scheduled_sessions' as any).insert({
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
    } as any);

    setSaving(false);
    if (error) {
      toast.error(t('common.error'));
    } else {
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
