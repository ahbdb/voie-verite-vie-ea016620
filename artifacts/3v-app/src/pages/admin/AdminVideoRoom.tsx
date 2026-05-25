import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminVideoRoom,
  type VideoMessageReactionRecord,
  type PeerStat,
  type RemoteVideoStream,
} from '@/hooks/useAdminVideoRoom';
import { useCallSession } from '@/contexts/CallSessionContext';
import { useCallKeepAlive } from '@/hooks/useCallKeepAlive';
import { useCallWakeLock } from '@/hooks/useCallWakeLock';
import { broadcastNotificationService } from '@/hooks/useBroadcastNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Activity,
  ArrowLeft,
  Camera,
  Edit2,
  Link2,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Radio,
  RotateCcw,
  Send,
  SwitchCamera,
  Trash2,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  AlertCircle,
  Bell,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '🙏', '😂', '🔥', '👏'];

// ── Permission denied panel ──────────────────────────────────────────────────
// Shown when the browser has blocked camera/microphone access.
// Cannot be fixed programmatically — only the user can unlock it in browser settings.

function detectPlatform() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
  if (isIOS && isPWA) return 'ios-pwa';
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return 'desktop';
}

const PLATFORM_STEPS: Record<string, { title: string; icon: string; steps: string[] }> = {
  'ios-pwa': {
    title: 'iPhone / iPad (Application installée)',
    icon: '📱',
    steps: [
      'Ferme cette application',
      'Ouvre les Réglages iPhone',
      'Fais défiler vers le bas et tape sur Safari',
      'Appuie sur « Paramètres des sites web »',
      'Appuie sur « Appareil photo » puis « Microphone »',
      'Trouve voie-verite-vie.netlify.app et mets sur Autoriser',
      "Reviens dans l'application et retente",
    ],
  },
  ios: {
    title: 'iPhone / iPad (Safari)',
    icon: '🧭',
    steps: [
      'Appuie sur le bouton AA à gauche de la barre d\'adresse',
      'Sélectionne « Réglages du site web »',
      'Appuie sur Appareil photo et Microphone',
      'Sélectionne « Autoriser »',
      'Recharge la page',
    ],
  },
  android: {
    title: 'Android (Chrome)',
    icon: '🤖',
    steps: [
      'Appuie sur l\'icône cadenas 🔒 dans la barre d\'adresse',
      'Sélectionne « Autorisations »',
      'Active le Microphone et la Caméra',
      'Recharge la page',
    ],
  },
  desktop: {
    title: 'Ordinateur (Chrome / Edge / Firefox)',
    icon: '💻',
    steps: [
      'Clique sur l\'icône cadenas 🔒 à gauche de la barre d\'adresse',
      'Clique sur « Autorisations du site » ou « Les autorisations de ce site »',
      'Mets Caméra et Microphone sur « Autoriser »',
      'Recharge la page',
    ],
  },
};

const PermissionDeniedPanel = ({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) => {
  const platform = detectPlatform();
  const info = PLATFORM_STEPS[platform];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10 text-center">
      <div className="mb-4 text-6xl">🔒</div>
      <h2 className="text-xl font-bold text-white mb-2">Accès micro / caméra bloqué</h2>
      <p className="text-zinc-400 text-sm max-w-sm mb-8">
        Votre navigateur a mémorisé un refus. Suivez ces étapes pour autoriser l'accès :
      </p>

      <div className="w-full max-w-sm bg-zinc-800/80 border border-zinc-700 rounded-2xl p-5 text-left mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{info.icon}</span>
          <span className="text-sm font-semibold text-zinc-200">{info.title}</span>
        </div>
        <ol className="space-y-2.5">
          {info.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-zinc-300">
              <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <Button
        onClick={onRetry}
        disabled={isRetrying}
        className="rounded-xl px-8 py-3 font-bold bg-primary hover:bg-primary/90"
      >
        {isRetrying
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Connexion…</>
          : <><RotateCcw className="h-4 w-4 mr-2" /> J'ai autorisé — Réessayer</>}
      </Button>
    </div>
  );
};

// ── Video panel ──────────────────────────────────────────────────────────────

const VideoPanel = ({
  stream,
  title,
  avatarUrl,
  muted = false,
  isMutedByAdmin = false,
  isSpeaking = false,
  isLocal = false,
  reactions = [],
}: {
  stream: MediaStream | null;
  title: string;
  avatarUrl?: string | null;
  muted?: boolean;
  isMutedByAdmin?: boolean;
  isSpeaking?: boolean;
  isLocal?: boolean;
  reactions?: Array<{ id: number; emoji: string }>;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled));
  const hasAudio = Boolean(stream?.getAudioTracks().some((t) => t.readyState === 'live'));

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Always attach stream to a dedicated audio element for remote participants.
  // Explicitly call .play() to bypass browser autoplay policy restrictions.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream || isLocal) return;
    audio.srcObject = stream;
    audio.play().catch(() => {
      // Autoplay was blocked; audio will resume on next user interaction
    });
  }, [stream, isLocal]);

  // Control muted state via DOM directly — React's muted prop doesn't update
  // reliably on already-playing <audio> elements.
  useEffect(() => {
    if (audioRef.current && !isLocal) {
      audioRef.current.muted = muted || isMutedByAdmin;
    }
  }, [muted, isMutedByAdmin, isLocal]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200',
        isSpeaking
          ? 'border-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.4)] scale-[1.01]'
          : 'border-border'
      )}
    >
      {/* Dedicated audio element for remote participants — always mounted so audio
          plays regardless of whether video is available. The <video> element below
          is muted to avoid double playback; all sound routes through this element.
          muted/play state is controlled via DOM refs in the useEffect hooks above. */}
      {!isLocal && (
        <audio ref={audioRef} playsInline />
      )}

      <div className="aspect-video bg-zinc-900">
        {stream && hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={title}
                className={cn(
                  'h-16 w-16 rounded-full object-cover border-2 transition-all',
                  isSpeaking ? 'border-green-400 scale-110 shadow-[0_0_0_3px_rgba(74,222,128,0.4)]' : 'border-zinc-600'
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white transition-all',
                  isSpeaking ? 'bg-green-500 scale-110' : 'bg-zinc-700'
                )}
              >
                {title.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-xs font-medium text-zinc-400">{title}</p>
          </div>
        )}
      </div>

      {/* Floating emoji reactions — animate upward like WhatsApp */}
      {reactions.map((r) => (
        <div
          key={r.id}
          className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-3xl select-none"
          style={{ animation: 'floatUp 3.5s ease-out forwards' }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <div className="flex items-center gap-1.5">
          {isSpeaking && (
            <span className="flex items-center gap-0.5">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="inline-block w-0.5 rounded-full bg-green-400"
                  style={{
                    height: `${6 + i * 3}px`,
                    animation: `speakBar${i} 0.6s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </span>
          )}
          <span className="text-xs font-medium text-white drop-shadow">
            {title}{isLocal ? ' (Vous)' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMutedByAdmin && (
            <span className="flex items-center gap-0.5 rounded-full bg-red-500/80 px-1.5 py-0.5 text-[9px] text-white">
              <VolumeX className="h-2.5 w-2.5" /> sourdine
            </span>
          )}
          {!hasAudio && !isLocal && (
            <MicOff className="h-3 w-3 text-red-400" />
          )}
        </div>
      </div>
    </div>
  );
};

const formatTime = (v: string) =>
  new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ── Diagnostic panel ─────────────────────────────────────────────────────────

type ParticipantLike = { user_id: string; display_name: string | null };

const CandidateBadge = ({ type }: { type: string }) => {
  if (type === 'relay')
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">RELAY ✓</span>;
  if (type === 'srflx')
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">SRFLX</span>;
  if (type === 'host')
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-600/40 text-zinc-300">LOCAL</span>;
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">?</span>;
};

const DiagnosticPanel = ({
  peerStats,
  participants,
}: {
  peerStats: Map<string, PeerStat>;
  participants: ParticipantLike[];
}) => {
  const getName = (uid: string) =>
    participants.find((p) => p.user_id === uid)?.display_name || uid.slice(0, 8) + '…';

  if (peerStats.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-600">
        <Activity className="h-6 w-6" />
        <p className="text-xs text-center">Stats disponibles<br />après connexion à un pair</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-3">
        {Array.from(peerStats.values()).map((stat) => (
          <div key={stat.userId} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white truncate">{getName(stat.userId)}</span>
              <span className={cn(
                'text-[10px] font-medium uppercase tracking-wide',
                stat.iceState === 'connected' ? 'text-green-400' :
                stat.iceState === 'failed' ? 'text-red-400' :
                'text-yellow-400'
              )}>
                {stat.iceState}
              </span>
            </div>

            {/* Candidate types */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-zinc-500 mb-1">Local</p>
                <CandidateBadge type={stat.localCandidateType} />
              </div>
              <div>
                <p className="text-zinc-500 mb-1">Distant</p>
                <CandidateBadge type={stat.remoteCandidateType} />
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {stat.rttMs !== null && (
                <div>
                  <p className="text-zinc-500 mb-0.5">Latence</p>
                  <p className={cn(
                    'font-mono font-semibold',
                    stat.rttMs < 100 ? 'text-green-400' :
                    stat.rttMs < 300 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {stat.rttMs} ms
                  </p>
                </div>
              )}
              <div>
                <p className="text-zinc-500 mb-0.5">Perte audio</p>
                <p className={cn(
                  'font-mono',
                  stat.audioPacketsLost === 0 ? 'text-green-400' :
                  stat.audioPacketsLost < 20 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {stat.audioPacketsLost} paquets
                </p>
              </div>
              <div>
                <p className="text-zinc-500 mb-0.5">Reçu</p>
                <p className="font-mono text-zinc-300">
                  {stat.bytesReceived > 1_048_576
                    ? `${(stat.bytesReceived / 1_048_576).toFixed(1)} MB`
                    : `${(stat.bytesReceived / 1024).toFixed(0)} KB`}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 mb-0.5">Envoyé</p>
                <p className="font-mono text-zinc-300">
                  {stat.bytesSent > 1_048_576
                    ? `${(stat.bytesSent / 1_048_576).toFixed(1)} MB`
                    : `${(stat.bytesSent / 1024).toFixed(0)} KB`}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Légende</p>
          <div className="space-y-1 text-[10px] text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold">RELAY</span>
              <span>= via serveur TURN (cross-continent ✓)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold">SRFLX</span>
              <span>= direct via STUN (même opérateur)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-300 font-bold">LOCAL</span>
              <span>= direct sur le même réseau</span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 pt-1">Mis à jour toutes les 3 s</p>
        </div>
      </div>
    </ScrollArea>
  );
};

// ── Connection status badge ──────────────────────────────────────────────────

const ConnectionBadge = ({
  isConnected,
  isJoining,
  quality,
}: {
  isConnected: boolean;
  isJoining: boolean;
  quality: 'good' | 'poor' | 'reconnecting';
}) => {
  if (isJoining) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Connexion…
      </span>
    );
  }
  if (isConnected && quality === 'reconnecting') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Reconnexion…
      </span>
    );
  }
  if (isConnected && quality === 'poor') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-400">
        <Wifi className="h-3 w-3" /> Connexion faible
      </span>
    );
  }
  if (isConnected) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-500">
        <CheckCircle2 className="h-3 w-3" /> Connecté
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <WifiOff className="h-3 w-3" /> Connexion…
    </span>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const AdminVideoRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const { user } = useAuth();
  const { adminRole } = useAdmin();
  const hasManagement = adminRole === 'admin' || adminRole === 'admin_principal';
  const displayName = user?.name || user?.email || 'Participant';

  const callSession = useCallSession();
  const { primeAudioPlayback } = callSession;

  const [draftMessage, setDraftMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoJoinedRef = useRef(false);
  const hardHangUpRef = useRef(false);
  // Tracks latest remote streams for unmount cleanup (stale closure prevention)
  const latestRemoteStreamsRef = useRef<RemoteVideoStream[]>([]);

  const {
    room, roomType, participants, remoteStreams, messages, reactions,
    localStream, loading, mediaError, micEnabled, cameraEnabled,
    isScreenSharing, isJoining, isConnected, canShareScreen,
    mutedParticipants, activeSpeakers, connectionQuality, peerStats,
    participantMicState, ejected, emojiReactions,
    requestJoin, toggleMicrophone, toggleCamera, flipCamera,
    startScreenShare, stopScreenShare,
    sendMessage, editMessage, deleteMessage, toggleReaction,
    muteParticipant, ejectParticipant, sendEmojiReaction,
    leaveRoom, endRoom, heartbeat, softLeave, triggerHardLeave,
  } = useAdminVideoRoom({
    roomId,
    userId: user?.id,
    displayName,
    enabled: Boolean(roomId && user?.id),
    canManageRoom: hasManagement,
  });

  // ── Register in global call context ────────────────────────────────────────

  useEffect(() => {
    if (!room || !roomId) return;
    callSession.startCall({
      roomId,
      roomTitle: room.title,
      roomType: room.room_type,
      isAdmin: hasManagement,
      startedAt: room.started_at ? new Date(room.started_at) : new Date(),
    });

    callSession.setHangUpFn(async () => {
      hardHangUpRef.current = true;
      triggerHardLeave();
      await leaveRoom();
      callSession.endCallSession();
      navigate('/');
    });

    callSession.setEndRoomFn(async () => {
      hardHangUpRef.current = true;
      triggerHardLeave();
      await endRoom();
      callSession.endCallSession();
      navigate('/');
    });

    callSession.setMicToggleFn(toggleMicrophone);

    return () => {
      callSession.setHangUpFn(null);
      callSession.setMicToggleFn(null);
      callSession.setEndRoomFn(null);
      if (hardHangUpRef.current) {
        callSession.endCallSession();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, roomId, hasManagement]);

  // Keep mic toggle in sync when it changes
  useEffect(() => {
    callSession.setMicToggleFn(toggleMicrophone);
  }, [toggleMicrophone, callSession]);

  // Notify context of live state changes for the banner
  useEffect(() => { callSession.notifyConnected(isConnected); }, [isConnected, callSession]);
  useEffect(() => { callSession.notifyMic(micEnabled); }, [micEnabled, callSession]);
  useEffect(() => { callSession.notifyParticipants(participants.length); }, [participants.length, callSession]);

  // ── Keep-alive when user navigates away without hanging up ────────────────
  // Shows a persistent OS notification ("appel en cours") when the page is hidden
  // and sends periodic DB heartbeats to keep the participant row active.
  useCallKeepAlive({
    isConnected,
    roomId,
    roomTitle: room?.title,
    onHeartbeat: heartbeat,
  });

  // ── Screen Wake Lock — prevents phone screen from sleeping during call ────
  // Android PWA: keeps screen on so Chrome stays in foreground audio mode.
  useCallWakeLock(isConnected);

  // Keep latest remote streams accessible at unmount time
  useEffect(() => { latestRemoteStreamsRef.current = remoteStreams; }, [remoteStreams]);

  // ── Automatic background audio on any navigation away ───────────────────────
  // Fires on EVERY unmount (back button, link tap, route change). If it is not
  // a hard hang-up, hand remote streams to the context so the user keeps hearing
  // others while browsing other pages (liturgical texts, chapelet, etc.).
  useEffect(() => {
    return () => {
      if (!hardHangUpRef.current) {
        const streams = latestRemoteStreamsRef.current.map((rs) => rs.stream).filter(Boolean);
        if (streams.length > 0) callSession.setBackgroundStreams(streams);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Clear background audio when this page is active ────────────────────────
  // Delayed by 300 ms so BackgroundAudio elements in CallSessionContext stay alive
  // until the VideoPanel <video> elements have had time to attach the same streams,
  // preventing a brief audio dropout on soft-leave return.
  useEffect(() => {
    const t = window.setTimeout(() => callSession.clearBackgroundStreams(), 300);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Prime audio on mount (unlocks autoplay without touching camera/mic) ────
  // requestJoin() is NOT called here because on installed PWA (iOS/Android),
  // getUserMedia MUST originate from a direct user tap — a useEffect does not
  // satisfy the browser's user-gesture requirement and the call gets denied.

  useEffect(() => {
    if (!roomId || !user?.id) return;
    if (!room && !loading) return;
    primeAudioPlayback();
  }, [room, loading, roomId, user?.id, primeAudioPlayback]);

  // ── Admin ejected this user from the call ────────────────────────────────
  useEffect(() => {
    if (!ejected) return;
    hardHangUpRef.current = true;
    callSession.endCallSession();
    toast.error('Vous avez été éjecté de cette session par un administrateur.');
    navigate('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejected]);

  // ── Auto-eject all participants when admin ends the room ──────────────────
  // The hook's Supabase subscription updates `room.status` for everyone in real
  // time. When it becomes 'ended', non-admin participants navigate away too.
  useEffect(() => {
    if (room?.status !== 'ended') return;
    // The admin who clicked "Terminer" already navigated away via handleEndRoom,
    // so hardHangUpRef is true for them — skip to avoid double-navigation.
    if (hardHangUpRef.current) return;
    // For all other participants: do a hard leave and navigate home.
    triggerHardLeave();
    callSession.endCallSession();
    toast.info('Cette réunion a été terminée par l\'administrateur.');
    navigate('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status]);

  // ── Soft-leave when user closes/refreshes the browser tab ────────────────
  // The component unmount already defaults to soft-leave; this catches the case
  // where the page is unloaded before React's cleanup runs (e.g., browser close).
  useEffect(() => {
    const handleUnload = () => {
      // Already a no-op since default unmount = soft leave.
      // We explicitly ensure hardLeaveRef stays false on accidental close.
      hardHangUpRef.current = false;
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Map userId → avatar_url for quick lookup in VideoPanel
  const participantAvatarMap = useMemo(() => {
    const map = new Map<string, string | null>();
    participants.forEach((p) => { if (p.avatar_url) map.set(p.user_id, p.avatar_url); });
    return map;
  }, [participants]);

  const reactionsByMessage = useMemo(() => {
    return reactions.reduce<Record<string, Record<string, VideoMessageReactionRecord[]>>>((acc, r) => {
      acc[r.message_id] ||= {};
      acc[r.message_id][r.emoji] ||= [];
      acc[r.message_id][r.emoji].push(r);
      return acc;
    }, {});
  }, [reactions]);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/meeting/${roomId}`;
      if (!room) {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié !');
        return;
      }
      const ref = room.started_at ? new Date(room.started_at) : new Date();
      const dateStr = ref.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = ref.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const typeLabel = room.room_type === 'audio' ? '🎙 Appel audio' : '📹 Réunion vidéo';
      const lines = [
        '✝ VOIE · VÉRITÉ · VIE',
        '',
        `📌 ${room.title}`,
        `📅 ${dateStr} à ${timeStr}`,
        typeLabel,
      ];
      if (room.description?.trim()) lines.push('', room.description.trim());
      lines.push('', `🔗 Rejoindre : ${url}`);
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Lien copié !');
    } catch { toast.error('Copie impossible'); }
  };

  /** Admin re-rings all participants without restarting the session. */
  const handleReRing = async () => {
    if (!room || !roomId) return;
    try {
      const typeLabel = room.room_type === 'audio' ? 'audio' : 'vidéo';
      await broadcastNotificationService.sendToAll(
        `📞 ${room.title}`,
        `Appel ${typeLabel} en cours — rejoignez maintenant !`,
        'call',
        undefined,
        `/meeting/${roomId}`,
      );
      toast.success('Sonnerie envoyée à tous');
    } catch {
      toast.error('Envoi de la sonnerie échoué');
    }
  };

  /** Soft leave — navigates away but keeps audio flowing in both directions.
   *  Background audio transfer happens automatically via the unmount effect. */
  const handleSoftLeave = () => {
    hardHangUpRef.current = false;
    softLeave();
    navigate('/');
  };

  /** Hard hang-up — disconnects fully and clears context. */
  const handleHardHangUp = async () => {
    hardHangUpRef.current = true;
    triggerHardLeave();
    await leaveRoom();
    callSession.endCallSession();
    navigate('/');
  };

  /** Admin end-room — confirmation required. */
  const handleEndRoom = async () => {
    try {
      hardHangUpRef.current = true;
      triggerHardLeave();
      await endRoom();
      callSession.endCallSession();
      toast.success('Réunion terminée pour tous');
      navigate('/');
      setShowEndConfirm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de terminer la réunion';
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draftMessage.trim()) return;
    if (!isConnected) { toast.error('Rejoins l\'appel d\'abord pour envoyer un message'); return; }
    try { await sendMessage(draftMessage); setDraftMessage(''); } catch { toast.error('Échec de l\'envoi'); }
  };

  const handleEdit = async (id: string) => {
    try { await editMessage(id, editContent); setEditingId(null); setEditContent(''); } catch { toast.error('Modification échouée'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMessage(id); toast.success('Message supprimé'); } catch { toast.error('Suppression échouée'); }
  };

  const handleToggleScreenShare = async () => {
    if (!isConnected) { toast.error('Rejoins l\'appel d\'abord'); return; }
    try {
      if (isScreenSharing) { await stopScreenShare(); } else { await startScreenShare(); }
    } catch (e: any) { toast.error(e?.message || 'Partage d\'écran impossible'); }
  };

  const headerBack = location.pathname.startsWith('/admin') ? '/admin/video' : '/';

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950">
        <Navigation />
        <main className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="w-full max-w-md text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Radio className="h-9 w-9 text-primary animate-pulse" />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">Voie · Vérité · Vie</p>
              <h1 className="text-2xl font-bold text-white font-cinzel">Vous êtes invité à rejoindre une réunion</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Cette réunion est réservée aux membres de l'association 3V. Connectez-vous ou créez un compte gratuit pour y participer.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link to={`/auth?redirect=/meeting/${roomId}`}>Se connecter</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Link to={`/auth?mode=signup&redirect=/meeting/${roomId}`}>Créer un compte gratuitement</Link>
              </Button>
            </div>

            <p className="text-xs text-zinc-600">
              En rejoignant, vous acceptez de participer dans le respect de la communauté 3V.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!loading && !room) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-24">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Réunion indisponible</CardTitle>
              <CardDescription>Cette salle n'existe plus ou a été terminée.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Retour
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {room && (
        <Helmet>
          <title>{room.title} — Voie Vérité Vie</title>
          <meta property="og:title" content={room.title} />
          <meta property="og:description" content={room.description || `Rejoignez la ${room.room_type === 'audio' ? 'réunion audio' : 'réunion vidéo'} sur Voie Vérité Vie`} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${window.location.origin}/meeting/${roomId}`} />
          <meta property="og:site_name" content="Voie Vérité Vie" />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={room.title} />
          <meta name="twitter:description" content={room.description || `Rejoignez la réunion sur Voie Vérité Vie`} />
        </Helmet>
      )}

      <Navigation />

      {/* ── End-room confirmation dialog ─────────────────────────────────── */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminer la réunion ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les participants seront déconnectés et la réunion sera marquée comme terminée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleEndRoom()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Terminer pour tous
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 flex flex-col pt-16 pb-24">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
              onClick={isConnected ? handleSoftLeave : () => navigate(headerBack)}
              title={isConnected ? 'Retour (rester en appel)' : 'Retour'}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm font-semibold text-white leading-none">{room?.title || 'Réunion'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {roomType === 'audio' ? '🎙 Audio' : roomType === 'live' ? '📡 Live' : '📹 Vidéo'}
                </span>
                {room?.status === 'live' && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> EN DIRECT
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ConnectionBadge isConnected={isConnected} isJoining={isJoining} quality={connectionQuality} />
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
              onClick={handleCopyLink}
              title="Copier le lien"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs hidden sm:flex">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Permission denied — full instructions */}
        {mediaError === 'PERMISSION_DENIED' && (
          <PermissionDeniedPanel
            onRetry={() => { primeAudioPlayback(); autoJoinedRef.current = false; void requestJoin(); }}
            isRetrying={isJoining}
          />
        )}

        {/* Other media errors */}
        {mediaError && mediaError !== 'PERMISSION_DENIED' && (
          <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{mediaError}</span>
            {!isConnected && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                onClick={() => { primeAudioPlayback(); autoJoinedRef.current = false; void requestJoin(); }}
                disabled={isJoining}
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Réessayer
              </Button>
            )}
          </div>
        )}

        {/* Loading room data */}
        {loading && !isConnected && !isJoining && !mediaError && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <p className="text-zinc-400 text-sm">Chargement de la salle…</p>
          </div>
        )}

        {/* Join button — getUserMedia must come from a direct user tap on PWA */}
        {!loading && !isConnected && !isJoining && !mediaError && room && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              {roomType === 'audio'
                ? <Mic className="h-9 w-9 text-primary" />
                : <Video className="h-9 w-9 text-primary" />}
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold text-lg">{room.title}</p>
              <p className="text-zinc-400 text-sm">
                {roomType === 'audio'
                  ? 'Appuyez pour activer votre microphone et rejoindre.'
                  : 'Appuyez pour activer votre micro et caméra et rejoindre.'}
              </p>
            </div>
            <Button
              size="lg"
              className="gap-2 px-8 text-base"
              onClick={() => { primeAudioPlayback(); void requestJoin(); }}
            >
              {roomType === 'audio'
                ? <><Mic className="h-5 w-5" /> Rejoindre l'appel</>
                : <><Video className="h-5 w-5" /> Rejoindre la réunion</>}
            </Button>
          </div>
        )}

        {/* Joining in progress */}
        {isJoining && !mediaError && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-white font-semibold">Connexion en cours…</p>
              <p className="text-zinc-400 text-sm mt-1">Accès à votre micro {roomType !== 'audio' ? 'et caméra ' : ''}en cours.</p>
            </div>
          </div>
        )}

        {/* Video + sidebar grid — shown once connected or streams available */}
        {(isConnected || remoteStreams.length > 0 || localStream) && (
          <div className="flex-1 grid gap-0 lg:grid-cols-[1fr_360px] overflow-hidden">
            {/* Video area — with optional flyer as background */}
            <section
              className="p-4 overflow-y-auto relative"
              style={room?.flyer_url ? {
                backgroundImage: `url(${room.flyer_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : undefined}
            >
              {/* Semi-transparent overlay so videos remain readable over flyer */}
              {room?.flyer_url && (
                <div className="absolute inset-0 bg-zinc-950/70 pointer-events-none" />
              )}
              <div
                className={cn(
                  'relative z-10 grid gap-3',
                  remoteStreams.length === 0 ? 'grid-cols-1 max-w-lg mx-auto' :
                  remoteStreams.length === 1 ? 'grid-cols-1 sm:grid-cols-2' :
                  remoteStreams.length <= 3 ? 'grid-cols-2' :
                  'grid-cols-2 lg:grid-cols-3'
                )}
              >
                {localStream && (
                  <VideoPanel
                    stream={localStream}
                    title={displayName}
                    avatarUrl={user?.id ? participantAvatarMap.get(user.id) : null}
                    muted
                    isLocal
                    isSpeaking={activeSpeakers.has(user?.id || '')}
                    reactions={emojiReactions.get(user?.id || '') || []}
                  />
                )}
                {remoteStreams.map((rs) => (
                  <VideoPanel
                    key={rs.userId}
                    stream={rs.stream}
                    title={rs.displayName}
                    avatarUrl={participantAvatarMap.get(rs.userId)}
                    isMutedByAdmin={mutedParticipants.has(rs.userId)}
                    isSpeaking={activeSpeakers.has(rs.userId)}
                    reactions={emojiReactions.get(rs.userId) || []}
                  />
                ))}
                {isConnected && remoteStreams.length === 0 && (
                  <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 gap-2 text-zinc-600">
                    <Wifi className="h-6 w-6" />
                    <span className="text-sm">En attente de participants…</span>
                  </div>
                )}
              </div>
            </section>

            {/* Sidebar */}
            <aside className="border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
              <Tabs defaultValue="chat" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className={`grid w-full rounded-none border-b border-zinc-800 bg-transparent h-10 shrink-0 ${adminRole === 'admin_principal' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger value="chat" className="rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">
                    💬 Chat
                  </TabsTrigger>
                  <TabsTrigger value="participants" className="rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">
                    👥 ({participants.length})
                  </TabsTrigger>
                  {adminRole === 'admin_principal' && (
                    <TabsTrigger value="diagnostic" className="rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">
                      📶 Réseau
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-2">
                      {messages.length === 0 ? (
                        <p className="py-12 text-center text-xs text-zinc-600">Aucun message pour l'instant</p>
                      ) : (
                        messages.map((msg) => {
                          const grouped = reactionsByMessage[msg.id] || {};
                          const isOwn = msg.user_id === user.id;
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                'rounded-lg p-2.5 text-sm',
                                isOwn ? 'bg-primary/10 border border-primary/20' : 'bg-zinc-800 border border-zinc-700'
                              )}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs text-white">
                                    {msg.display_name || 'Participant'}
                                  </span>
                                  <span className="text-[10px] text-zinc-500">{formatTime(msg.created_at)}</span>
                                  {msg.updated_at !== msg.created_at && (
                                    <span className="text-[10px] text-zinc-600 italic">modifié</span>
                                  )}
                                </div>
                                {isOwn && editingId !== msg.id && (
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-zinc-500 hover:text-white"
                                      onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                                    >
                                      <Edit2 className="h-2.5 w-2.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-red-500 hover:text-red-400"
                                      onClick={() => void handleDelete(msg.id)}
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {editingId === msg.id ? (
                                <div className="flex gap-1 mt-1">
                                  <Input
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="h-7 text-xs bg-zinc-900 border-zinc-600"
                                  />
                                  <Button size="sm" className="h-7 px-2" onClick={() => void handleEdit(msg.id)}>OK</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-400" onClick={() => setEditingId(null)}>✕</Button>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap text-zinc-200 text-xs leading-relaxed">{msg.content}</p>
                              )}

                              {/* Reactions */}
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {QUICK_REACTIONS.map((emoji) => {
                                  const count = grouped[emoji]?.length || 0;
                                  const active = grouped[emoji]?.some((r) => r.user_id === user.id);
                                  if (count === 0 && !active) return null;
                                  return (
                                    <button
                                      key={`${msg.id}-${emoji}`}
                                      onClick={() => void toggleReaction(msg.id, emoji)}
                                      className={cn(
                                        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] border transition-colors',
                                        active
                                          ? 'border-primary bg-primary/20 text-primary'
                                          : 'border-zinc-600 bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                                      )}
                                    >
                                      {emoji} {count}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="p-3 border-t border-zinc-800 space-y-2 shrink-0">
                    <div className="flex flex-wrap gap-1">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setDraftMessage((c) => c + emoji)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-sm hover:bg-zinc-800 text-zinc-300"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <Input
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        placeholder={isConnected ? 'Écrire un message…' : 'Connexion en cours…'}
                        className="flex-1 h-9 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        disabled={!draftMessage.trim() || !isConnected}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="participants" className="flex-1 overflow-y-auto m-0 p-3 data-[state=inactive]:hidden">
                  <div className="space-y-2">
                    {participants.length === 0 ? (
                      <p className="py-12 text-center text-xs text-zinc-600">Aucun participant actif</p>
                    ) : (
                      participants.map((p) => {
                        const isSelf = p.user_id === user.id;
                        const isMuted = mutedParticipants.has(p.user_id);
                        const speaking = activeSpeakers.has(p.user_id);
                        const micOn = participantMicState.get(p.user_id) ?? true;

                        return (
                          <div
                            key={p.user_id}
                            className={cn(
                              'flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors',
                              speaking
                                ? 'border-green-500/40 bg-green-500/5'
                                : 'border-zinc-700 bg-zinc-800'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                                  speaking ? 'bg-green-500' : 'bg-zinc-600'
                                )}
                              >
                                {(p.display_name || 'P').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white leading-none">
                                  {p.display_name || 'Participant'}
                                  {isSelf && <span className="ml-1.5 text-[10px] text-zinc-500">(Vous)</span>}
                                </p>
                                {speaking && (
                                  <p className="text-[10px] text-green-400 mt-0.5 flex items-center gap-1">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                    En train de parler
                                  </p>
                                )}
                                {!speaking && (
                                  <p className="text-[10px] text-zinc-600 mt-0.5">
                                    Rejoint {formatTime(p.joined_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Mic status indicator — visible to everyone */}
                              <span title={micOn ? 'Micro actif' : 'Micro coupé'}>
                                {micOn
                                  ? <Mic className="h-3.5 w-3.5 text-green-400" />
                                  : <MicOff className="h-3.5 w-3.5 text-red-400" />}
                              </span>
                              {hasManagement && !isSelf && (
                                <>
                                  {/* Admin mute / unmute */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      'h-7 w-7',
                                      isMuted ? 'text-red-400 hover:text-red-300' : 'text-zinc-400 hover:text-white'
                                    )}
                                    onClick={() => void muteParticipant(p.user_id)}
                                    title={isMuted ? 'Rétablir le son (admin)' : 'Mettre en sourdine (admin)'}
                                  >
                                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                  </Button>
                                  {/* Eject participant */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-orange-400 hover:text-orange-300"
                                    onClick={() => void ejectParticipant(p.user_id)}
                                    title="Éjecter ce participant"
                                  >
                                    <LogOut className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="diagnostic" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
                  <DiagnosticPanel peerStats={peerStats} participants={participants} />
                </TabsContent>
              </Tabs>
            </aside>
          </div>
        )}
      </main>

      {/* ── Floating bottom control bar ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 px-4 py-3">
        {isConnected ? (
          <>
            {/* Mic */}
            <button
              onClick={toggleMicrophone}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors min-w-[56px]',
                micEnabled
                  ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              )}
              title={micEnabled ? 'Couper le micro' : 'Activer le micro'}
            >
              {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              <span className="text-[9px] font-medium">{micEnabled ? 'Micro' : 'Muet'}</span>
            </button>

            {/* Camera (video only) */}
            {roomType !== 'audio' && (
              <button
                onClick={toggleCamera}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors min-w-[56px]',
                  cameraEnabled
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                )}
                title={cameraEnabled ? 'Couper la caméra' : 'Activer la caméra'}
              >
                {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                <span className="text-[9px] font-medium">{cameraEnabled ? 'Caméra' : 'Cam. off'}</span>
              </button>
            )}

            {/* Flip camera (mobile) */}
            {roomType !== 'audio' && (
              <button
                onClick={() => void flipCamera()}
                className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700 transition-colors min-w-[56px]"
                title="Retourner la caméra"
              >
                <SwitchCamera className="h-5 w-5" />
                <span className="text-[9px] font-medium">Retourner</span>
              </button>
            )}

            {/* Screen share */}
            {canShareScreen && (
              <button
                onClick={() => void handleToggleScreenShare()}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors min-w-[56px]',
                  isScreenSharing
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                )}
                title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
              >
                {isScreenSharing ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
                <span className="text-[9px] font-medium">{isScreenSharing ? 'Arrêter' : 'Partager'}</span>
              </button>
            )}

            {/* Participants count */}
            <div className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800/50 px-3 py-2 text-zinc-500 min-w-[56px]">
              <span className="text-base font-bold text-zinc-300">{participants.length}</span>
              <span className="text-[9px] font-medium">Participants</span>
            </div>

            {/* Emoji reactions — WhatsApp-style floating emoji on your video tile */}
            <div className="flex items-center gap-0.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => void sendEmojiReaction(emoji)}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-1.5 py-1.5 text-sm transition-colors"
                  title={`Réaction ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-zinc-700 mx-0.5" />

            {/* Re-ring — admin rings all participants again without restarting */}
            {hasManagement && (
              <button
                onClick={() => void handleReRing()}
                className="flex flex-col items-center gap-1 rounded-xl bg-amber-500/20 px-3 py-2 text-amber-400 hover:bg-amber-500/30 transition-colors min-w-[56px]"
                title="Sonner à nouveau pour inviter les absents"
              >
                <Bell className="h-5 w-5" />
                <span className="text-[9px] font-medium">Sonner</span>
              </button>
            )}

            {/* Terminer — any admin can end the session */}
            {hasManagement && (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="flex flex-col items-center gap-1 rounded-xl bg-red-500 px-3 py-2 text-white hover:bg-red-600 transition-colors min-w-[56px]"
                title="Terminer la réunion pour tous les participants"
              >
                <Radio className="h-5 w-5" />
                <span className="text-[9px] font-medium">Terminer</span>
              </button>
            )}

            {/* Soft leave — stay in call, visible to everyone */}
            <button
              onClick={handleSoftLeave}
              className="flex flex-col items-center gap-1 rounded-xl bg-zinc-700 px-3 py-2 text-white hover:bg-zinc-600 transition-colors min-w-[56px]"
              title="Naviguer ailleurs sans raccrocher"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[9px] font-medium">Quitter</span>
            </button>

            {/* Hard hang-up — everyone except the session creator sees this as main exit */}
            <button
              onClick={() => void handleHardHangUp()}
              className="flex flex-col items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700 transition-colors min-w-[56px]"
              title="Raccrocher (quitter l'appel)"
            >
              <PhoneOff className="h-5 w-5" />
              <span className="text-[9px] font-medium">Raccrocher</span>
            </button>
          </>
        ) : (
          /* Still joining / connecting */
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isJoining ? 'Connexion au micro/caméra…' : 'Connexion à la salle…'}
            {mediaError && (
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-8 border-zinc-700 text-zinc-300"
                onClick={() => { primeAudioPlayback(); autoJoinedRef.current = false; void requestJoin(); }}
                disabled={isJoining}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réessayer
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVideoRoom;
