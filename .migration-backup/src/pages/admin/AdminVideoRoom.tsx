import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminVideoRoom,
  type VideoMessageReactionRecord,
} from '@/hooks/useAdminVideoRoom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Camera,
  Edit2,
  Link2,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Radio,
  RotateCcw,
  Send,
  SwitchCamera,
  Trash2,
  Video,
  VideoOff,
  VolumeX,
  Volume2,
} from 'lucide-react';

const QUICK_REACTIONS = ['👍', '❤️', '🙏', '😂', '🔥', '👏'];

const VideoPanel = ({
  stream,
  title,
  subtitle,
  muted = false,
  isMutedByAdmin = false,
}: {
  stream: MediaStream | null;
  title: string;
  subtitle: string;
  muted?: boolean;
  isMutedByAdmin?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled));
  const hasAudio = Boolean(stream?.getAudioTracks().some((t) => t.readyState === 'live'));

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="aspect-video bg-muted">
        {stream && hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted || isMutedByAdmin}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {hasAudio ? <Mic className="h-5 w-5 text-primary" /> : <VideoOff className="h-5 w-5 text-primary" />}
            </div>
            <p className="text-xs font-medium">{title}</p>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
        <span className="text-xs font-medium text-white drop-shadow">{title}</span>
        <div className="flex items-center gap-1">
          {hasAudio && <Mic className="h-3 w-3 text-white" />}
          {isMutedByAdmin && <VolumeX className="h-3 w-3 text-destructive" />}
        </div>
      </div>
    </div>
  );
};

const formatTime = (v: string) =>
  new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const AdminVideoRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const { user } = useAuth();
  const { adminRole } = useAdmin();
  const hasManagement = adminRole === 'admin' || adminRole === 'admin_principal';
  const displayName = user?.user_metadata?.full_name || user?.email || 'Participant';
  const [draftMessage, setDraftMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    room, roomType, participants, remoteStreams, messages, reactions,
    localStream, loading, mediaError, micEnabled, cameraEnabled,
    isScreenSharing, isJoining, isConnected, canShareScreen, mutedParticipants,
    requestJoin, toggleMicrophone, toggleCamera, flipCamera,
    startScreenShare, stopScreenShare,
    sendMessage, editMessage, deleteMessage, toggleReaction,
    muteParticipant, leaveRoom, endRoom,
  } = useAdminVideoRoom({
    roomId,
    userId: user?.id,
    displayName,
    enabled: Boolean(roomId && user?.id),
    canManageRoom: hasManagement,
  });

  const reactionsByMessage = useMemo(() => {
    return reactions.reduce<Record<string, Record<string, VideoMessageReactionRecord[]>>>((acc, r) => {
      acc[r.message_id] ||= {};
      acc[r.message_id][r.emoji] ||= [];
      acc[r.message_id][r.emoji].push(r);
      return acc;
    }, {});
  }, [reactions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meeting/${roomId}`);
      toast.success('Lien copié');
    } catch { toast.error('Copie impossible'); }
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate(hasManagement ? '/admin/video' : '/');
  };

  const handleEndRoom = async () => {
    await endRoom();
    toast.success('Réunion terminée');
    navigate('/admin/video');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConnected) { toast.error('Rejoins l\'appel d\'abord'); return; }
    try { await sendMessage(draftMessage); setDraftMessage(''); } catch { toast.error('Échec envoi'); }
  };

  const handleEdit = async (id: string) => {
    try { await editMessage(id, editContent); setEditingId(null); setEditContent(''); } catch { toast.error('Modification échouée'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMessage(id); toast.success('Supprimé'); } catch { toast.error('Suppression échouée'); }
  };

  const handleToggleScreenShare = async () => {
    if (!isConnected) { toast.error('Rejoins l\'appel'); return; }
    try {
      if (isScreenSharing) { await stopScreenShare(); } else { await startScreenShare(); }
    } catch { toast.error('Partage d\'écran impossible'); }
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
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="container mx-auto flex-1 space-y-4 px-4 py-6 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(headerBack)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{room?.title || 'Réunion'}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{roomType === 'audio' ? 'Audio' : 'Vidéo'}</span>
                {room?.status === 'live' && (
                  <span className="flex items-center gap-1 text-xs text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" /> En direct
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Control bar - icons only */}
          <div className="flex items-center gap-1">
            {!isConnected && (
              <Button size="sm" onClick={() => void requestJoin()} disabled={isJoining || loading}>
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <span className="hidden sm:inline ml-1">Rejoindre</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleCopyLink} title="Copier le lien">
              <Link2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMicrophone} disabled={!isConnected} title={micEnabled ? 'Couper micro' : 'Activer micro'}>
              {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-destructive" />}
            </Button>
            {roomType === 'video' && (
              <>
                <Button variant="ghost" size="icon" onClick={toggleCamera} disabled={!isConnected} title={cameraEnabled ? 'Couper caméra' : 'Activer caméra'}>
                  {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-destructive" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => void flipCamera()} disabled={!isConnected || isScreenSharing} title="Tourner caméra">
                  <SwitchCamera className="h-4 w-4" />
                </Button>
              </>
            )}
            {canShareScreen && (
              <Button variant="ghost" size="icon" onClick={() => void handleToggleScreenShare()} disabled={!isConnected} title="Partager l'écran">
                <MonitorUp className={`h-4 w-4 ${isScreenSharing ? 'text-primary' : ''}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => void handleLeave()} title="Quitter">
              <PhoneOff className="h-4 w-4 text-destructive" />
            </Button>
            {hasManagement && (
              <Button variant="destructive" size="sm" onClick={() => void handleEndRoom()}>
                <Radio className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Terminer</span>
              </Button>
            )}
          </div>
        </div>

        {mediaError && (
          <Alert>
            <Radio className="h-4 w-4" />
            <AlertTitle>Média</AlertTitle>
            <AlertDescription>{mediaError}</AlertDescription>
          </Alert>
        )}

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Video grid */}
          <section>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <VideoPanel stream={localStream} title="Vous" subtitle="" muted />
              {remoteStreams.map((rs) => (
                <VideoPanel
                  key={rs.userId}
                  stream={rs.stream}
                  title={rs.displayName}
                  subtitle=""
                  isMutedByAdmin={mutedParticipants.has(rs.userId)}
                />
              ))}
              {remoteStreams.length === 0 && (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  En attente de participants...
                </div>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside>
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">💬 Chat</TabsTrigger>
                <TabsTrigger value="participants">👥 ({participants.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="chat">
                <Card className="border-border/70">
                  <CardContent className="p-3 space-y-3">
                    <ScrollArea className="h-[50vh] rounded-lg border border-border bg-muted/20 p-2">
                      <div className="space-y-2 pr-2">
                        {messages.length === 0 ? (
                          <p className="py-8 text-center text-xs text-muted-foreground">Aucun message</p>
                        ) : (
                          messages.map((msg) => {
                            const grouped = reactionsByMessage[msg.id] || {};
                            const isOwn = msg.user_id === user.id;

                            return (
                              <div key={msg.id} className={`rounded-lg border border-border p-2 text-sm ${isOwn ? 'bg-primary/5' : 'bg-card'}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-foreground text-xs">{msg.display_name || 'Participant'}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                    {msg.updated_at !== msg.created_at && <span className="text-[10px] text-muted-foreground">(modifié)</span>}
                                  </div>
                                  {isOwn && editingId !== msg.id && (
                                    <div className="flex items-center gap-0.5">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}>
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => void handleDelete(msg.id)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {editingId === msg.id ? (
                                  <div className="mt-1 flex gap-1">
                                    <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="h-7 text-xs" />
                                    <Button size="sm" className="h-7 px-2" onClick={() => void handleEdit(msg.id)}>OK</Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>✕</Button>
                                  </div>
                                ) : (
                                  <p className="mt-1 whitespace-pre-wrap text-foreground text-xs leading-relaxed">{msg.content}</p>
                                )}
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {QUICK_REACTIONS.map((emoji) => {
                                    const count = grouped[emoji]?.length || 0;
                                    const active = grouped[emoji]?.some((r) => r.user_id === user.id);
                                    if (count === 0 && !active) return null;
                                    return (
                                      <button
                                        key={`${msg.id}-${emoji}`}
                                        onClick={() => void toggleReaction(msg.id, emoji)}
                                        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] border ${active ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'}`}
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

                    {/* Quick emoji bar */}
                    <div className="flex flex-wrap gap-1">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setDraftMessage((c) => c + emoji)}
                          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <Input
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        placeholder="Message..."
                        className="flex-1 h-9 text-sm"
                      />
                      <Button type="submit" size="icon" className="h-9 w-9" disabled={!draftMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="participants">
                <Card className="border-border/70">
                  <CardContent className="p-3 space-y-2">
                    {participants.map((p) => {
                      const isSelf = p.user_id === user.id;
                      const isMuted = mutedParticipants.has(p.user_id);

                      return (
                        <div key={p.user_id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.display_name || 'Participant'}</p>
                            <p className="text-[10px] text-muted-foreground">{isSelf ? 'Vous' : formatTime(p.joined_at)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-secondary" />
                            {hasManagement && !isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => muteParticipant(p.user_id)}
                                title={isMuted ? 'Rétablir le son' : 'Couper le son'}
                              >
                                {isMuted ? <VolumeX className="h-3.5 w-3.5 text-destructive" /> : <Volume2 className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {participants.length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">Aucun participant</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default AdminVideoRoom;
