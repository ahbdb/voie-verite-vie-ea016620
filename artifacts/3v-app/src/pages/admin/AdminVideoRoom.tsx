import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminVideoRoom,
  type VideoMessageReactionRecord,
  type PeerStat,
} from '@/hooks/useAdminVideoRoom';
import { useCallSession } from '@/contexts/CallSessionContext';
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
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '🙏', '😂', '🔥', '👏'];

// ── Video panel ──────────────────────────────────────────────────────────────

const VideoPanel = ({
  stream,
  title,
  muted = false,
  isMutedByAdmin = false,
  isSpeaking = false,
  isLocal = false,
}: {
  stream: MediaStream | null;
  title: string;
  muted?: boolean;
  isMutedByAdmin?: boolean;
  isSpeaking?: boolean;
  isLocal?: boolean;
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
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white transition-all',
                isSpeaking ? 'bg-green-500 scale-110' : 'bg-zinc-700'
              )}
            >
              {title.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs font-medium text-zinc-400">{title}</p>
          </div>
        )}
      </div>

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
  const displayName = user?.user_metadata?.full_name || user?.email || 'Participant';

  const callSession = useCallSession();

  const [draftMessage, setDraftMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoJoinedRef = useRef(false);
  const hardHangUpRef = useRef(false);

  const {
    room, roomType, participants, remoteStreams, messages, reactions,
    localStream, loading, mediaError, micEnabled, cameraEnabled,
    isScreenSharing, isJoining, isConnected, canShareScreen,
    mutedParticipants, activeSpeakers, connectionQuality, peerStats,
    requestJoin, toggleMicrophone, toggleCamera, flipCamera,
    startScreenShare, stopScreenShare,
    sendMessage, editMessage, deleteMessage, toggleReaction,
    muteParticipant, leaveRoom, endRoom, softLeave, triggerHardLeave,
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
      navigate(hasManagement ? '/admin/video' : '/');
    });

    callSession.setMicToggleFn(toggleMicrophone);

    return () => {
      callSession.setHangUpFn(null);
      callSession.setMicToggleFn(null);
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

  // ── Auto-join on mount (WhatsApp-style: no intermediate "join" prompt) ─────

  useEffect(() => {
    if (autoJoinedRef.current) return;
    if (!roomId || !user?.id) return;
    // Wait until the room record is loaded, then auto-join
    if (!room && !loading) return;
    autoJoinedRef.current = true;
    void requestJoin();
  }, [room, loading, roomId, user?.id, requestJoin]);

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
    navigate(hasManagement ? '/admin/video' : '/');
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
      await navigator.clipboard.writeText(`${window.location.origin}/meeting/${roomId}`);
      toast.success('Lien copié !');
    } catch { toast.error('Copie impossible'); }
  };

  /** Soft leave — navigates away but keeps audio flowing to remote peers. */
  const handleSoftLeave = () => {
    hardHangUpRef.current = false;
    softLeave(); // marks hook: skip full cleanup on unmount
    navigate(hasManagement ? '/admin/video' : '/');
  };

  /** Hard hang-up — disconnects fully and clears context. */
  const handleHardHangUp = async () => {
    hardHangUpRef.current = true;
    triggerHardLeave();
    await leaveRoom();
    callSession.endCallSession();
    navigate(hasManagement ? '/admin/video' : '/');
  };

  /** Admin end-room — confirmation required. */
  const handleEndRoom = async () => {
    hardHangUpRef.current = true;
    triggerHardLeave();
    await endRoom();
    callSession.endCallSession();
    toast.success('Réunion terminée pour tous');
    navigate('/admin/video');
    setShowEndConfirm(false);
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
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-24">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Connexion requise</CardTitle>
              <CardDescription>Connecte-toi pour rejoindre la réunion.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link to="/auth">Se connecter</Link></Button>
            </CardContent>
          </Card>
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

        {/* Media error banner */}
        {mediaError && (
          <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{mediaError}</span>
            {!isConnected && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                onClick={() => { autoJoinedRef.current = false; void requestJoin(); }}
                disabled={isJoining}
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Réessayer
              </Button>
            )}
          </div>
        )}

        {/* Auto-join loading state */}
        {(isJoining || (loading && !isConnected)) && !mediaError && (
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
            {/* Video area */}
            <section className="p-4 overflow-y-auto">
              <div
                className={cn(
                  'grid gap-3',
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
                    muted
                    isLocal
                    isSpeaking={activeSpeakers.has(user?.id || '')}
                  />
                )}
                {remoteStreams.map((rs) => (
                  <VideoPanel
                    key={rs.userId}
                    stream={rs.stream}
                    title={rs.displayName}
                    isMutedByAdmin={mutedParticipants.has(rs.userId)}
                    isSpeaking={activeSpeakers.has(rs.userId)}
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
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-zinc-800 bg-transparent h-10 shrink-0">
                  <TabsTrigger value="chat" className="rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">
                    💬 Chat
                  </TabsTrigger>
                  <TabsTrigger value="participants" className="rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">
                    👥 ({participants.length})
                  </TabsTrigger>
                  <TabsTrigger value="diagnostic" className="rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">
                    📶 Réseau
                  </TabsTrigger>
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
                              {hasManagement && !isSelf && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-7 w-7',
                                    isMuted ? 'text-red-400 hover:text-red-300' : 'text-zinc-400 hover:text-white'
                                  )}
                                  onClick={() => muteParticipant(p.user_id)}
                                  title={isMuted ? 'Rétablir le son' : 'Mettre en sourdine'}
                                >
                                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                </Button>
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

            <div className="w-px h-8 bg-zinc-700 mx-1" />

            {/* End (admin) */}
            {hasManagement && (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="flex flex-col items-center gap-1 rounded-xl bg-red-500 px-3 py-2 text-white hover:bg-red-600 transition-colors min-w-[56px]"
                title="Terminer la réunion pour tous"
              >
                <Radio className="h-5 w-5" />
                <span className="text-[9px] font-medium">Terminé</span>
              </button>
            )}

            {/* Soft leave — stay in call */}
            <button
              onClick={handleSoftLeave}
              className="flex flex-col items-center gap-1 rounded-xl bg-zinc-700 px-3 py-2 text-white hover:bg-zinc-600 transition-colors min-w-[56px]"
              title="Naviguer ailleurs sans raccrocher"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[9px] font-medium">Quitter</span>
            </button>

            {/* Hard hang-up */}
            <button
              onClick={() => void handleHardHangUp()}
              className="flex flex-col items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700 transition-colors min-w-[56px]"
              title="Raccrocher"
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
                onClick={() => { autoJoinedRef.current = false; void requestJoin(); }}
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
