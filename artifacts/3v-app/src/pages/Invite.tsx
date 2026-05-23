import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  Loader2,
  LogIn,
  Mic,
  Radio,
  UserPlus,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

interface InvitePayload {
  source: 'scheduled' | 'room';
  id: string;
  title: string;
  description: string | null;
  type: 'audio' | 'video' | 'live' | string;
  status: string;
  scheduledAt: Date | null;
  durationMin: number | null;
  roomId: string | null;
}

const SUPPORTED_TIMEZONES = [
  'UTC',
  'Europe/Paris',
  'Europe/London',
  'Europe/Rome',
  'America/New_York',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Africa/Abidjan',
  'Africa/Kinshasa',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const formatInTimezone = (date: Date, tz: string) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toUTCString();
  }
};

const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const Invite = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<InvitePayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tz, setTz] = useState<string>(getBrowserTimezone());
  const [now, setNow] = useState(new Date());

  // Resolve the id: it can be either a scheduled_session id OR a video_room id
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Try scheduled_sessions first
        const { data: sched } = await db
          .from('scheduled_sessions')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (sched && !cancelled) {
          // Times are stored as GMT/UTC date+time strings
          const iso = `${sched.scheduled_date}T${sched.scheduled_time}Z`;
          setData({
            source: 'scheduled',
            id: sched.id,
            title: sched.title,
            description: sched.description,
            type: sched.session_type,
            status: sched.status,
            scheduledAt: new Date(iso),
            durationMin: sched.estimated_duration ?? null,
            roomId: sched.video_room_id ?? null,
          });
          return;
        }

        // Fall back to video_rooms direct invitation
        const { data: room } = await db
          .from('video_rooms')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (room && !cancelled) {
          setData({
            source: 'room',
            id: room.id,
            title: room.title,
            description: room.description,
            type: room.room_type,
            status: room.status,
            scheduledAt: room.started_at ? new Date(room.started_at) : null,
            durationMin: null,
            roomId: room.id,
          });
          return;
        }

        if (!cancelled) setNotFound(true);
      } catch (err) {
        console.error('[invite] load error', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Tick the clock every 30 s so countdown stays fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const timeUntilStart = useMemo(() => {
    if (!data?.scheduledAt) return null;
    const diffMs = data.scheduledAt.getTime() - now.getTime();
    if (diffMs <= 0) return 'maintenant';
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `dans ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `dans ${hours} h ${minutes % 60} min`;
    const days = Math.floor(hours / 24);
    return `dans ${days} jour${days > 1 ? 's' : ''}`;
  }, [data?.scheduledAt, now]);

  const isLiveNow = data?.status === 'live' || (data?.source === 'room' && data?.status !== 'ended');
  const isEnded = data?.status === 'ended';

  const typeIcon = data?.type === 'audio'
    ? <Mic className="h-4 w-4" />
    : data?.type === 'live'
    ? <Radio className="h-4 w-4" />
    : <Video className="h-4 w-4" />;

  const typeLabel = data?.type === 'audio'
    ? 'Appel audio'
    : data?.type === 'live'
    ? 'Diffusion en direct'
    : 'Réunion vidéo';

  const handleJoin = () => {
    if (!data) return;
    const targetRoomId = data.roomId || (data.source === 'room' ? data.id : null);
    if (!targetRoomId) {
      toast.info("Cette session n'a pas encore démarré. Reviens un peu plus tard.");
      return;
    }
    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=${encodeURIComponent(`/meeting/${targetRoomId}`)}`);
      return;
    }
    navigate(`/meeting/${targetRoomId}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: data?.title || 'Invitation', url });
        return;
      } catch { /* ignore cancellation */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papier');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invitation introuvable</CardTitle>
            <CardDescription>
              Ce lien n&apos;est plus valable ou la session a été supprimée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <Helmet>
        <title>{data.title} — Invitation</title>
        <meta name="description" content={data.description || `Rejoins ${data.title}`} />
      </Helmet>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-xl">
          <Card className="border-border/70 shadow-xl overflow-hidden">
            {/* Banner */}
            <div className={`px-6 py-4 ${isLiveNow ? 'bg-gradient-to-r from-red-500 to-red-600' : isEnded ? 'bg-muted' : 'bg-gradient-to-r from-primary to-primary/80'}`}>
              <div className="flex items-center gap-2 text-white">
                {isLiveNow ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest">En direct maintenant</span>
                  </>
                ) : isEnded ? (
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Session terminée</span>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Invitation</span>
                  </>
                )}
              </div>
            </div>

            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1.5">
                  {typeIcon} {typeLabel}
                </Badge>
                {timeUntilStart && !isLiveNow && !isEnded && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" /> {timeUntilStart}
                  </Badge>
                )}
                {data.durationMin && (
                  <Badge variant="outline" className="text-xs">
                    {data.durationMin} min
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-balance">{data.title}</CardTitle>
              {data.description && (
                <CardDescription className="text-base leading-relaxed">
                  {data.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Timezone picker + time display */}
              {data.scheduledAt && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Globe className="h-4 w-4 text-primary" />
                      Horaire dans votre fuseau
                    </div>
                    <select
                      value={tz}
                      onChange={(e) => setTz(e.target.value)}
                      className="text-xs bg-background border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {!SUPPORTED_TIMEZONES.includes(tz) && (
                        <option value={tz}>{tz} (auto)</option>
                      )}
                      {SUPPORTED_TIMEZONES.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-start gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold">
                      {formatInTimezone(data.scheduledAt, tz)}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-muted-foreground border-t border-border/60 pt-3">
                    <CalendarIcon className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="text-xs">
                      Référence GMT :{' '}
                      {new Intl.DateTimeFormat('fr-FR', {
                        timeZone: 'UTC',
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(data.scheduledAt)} GMT
                    </p>
                  </div>
                </div>
              )}

              {/* CTA */}
              {!isEnded && (
                <Button
                  onClick={handleJoin}
                  size="lg"
                  className={`w-full text-base font-bold py-6 ${isLiveNow ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                >
                  {user ? (
                    <>
                      <Video className="h-5 w-5 mr-2" />
                      {isLiveNow ? 'Rejoindre maintenant' : data.roomId ? 'Ouvrir la salle' : 'Préparer ma place'}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Se connecter pour rejoindre
                    </>
                  )}
                </Button>
              )}

              {!user && !isEnded && (
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(window.location.pathname)}`}>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Créer un compte gratuit
                  </Link>
                </Button>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShare} className="flex-1">
                  Partager le lien
                </Button>
                <Button variant="ghost" size="sm" asChild className="flex-1">
                  <Link to="/">Voir l&apos;application</Link>
                </Button>
              </div>

              {isEnded && (
                <p className="text-center text-sm text-muted-foreground">
                  Cette session est terminée. Consulte les replays sur la page Lives.
                </p>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Voie Vérité Vie — Invitation officielle
          </p>
        </div>
      </main>
    </div>
  );
};

export default Invite;
