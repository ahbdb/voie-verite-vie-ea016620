import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, CalendarClock, Image, Phone, Plus, Radio, RefreshCw, Trash2, Users, Video, Mic, Upload } from 'lucide-react';
import type { VideoParticipantRecord, VideoRoomRecord } from '@/hooks/useAdminVideoRoom';
import { useCallSession } from '@/contexts/CallSessionContext';

const db = supabase as any;

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

const AdminVideo = () => {
  const navigate = useNavigate();
  const { user, adminRole } = useAdmin();
  const { primeAudioPlayback } = useCallSession();
  const hasVideoAccess = adminRole === 'admin' || adminRole === 'admin_principal';
  const [rooms, setRooms] = useState<VideoRoomRecord[]>([]);
  const [participants, setParticipants] = useState<VideoParticipantRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [callMode, setCallMode] = useState<'all' | 'select'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [roomToDelete, setRoomToDelete] = useState<VideoRoomRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    roomType: 'video' as 'video' | 'audio',
    scheduledAt: '',
    flyerUrl: '',
  });
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

  const activeParticipantsByRoom = useMemo(() => {
    return participants.reduce<Record<string, number>>((acc, p) => {
      if (p.is_active && !p.left_at) acc[p.room_id] = (acc[p.room_id] || 0) + 1;
      return acc;
    }, {});
  }, [participants]);

  const loadRooms = async () => {
    try {
      const [{ data: roomsData, error: re }, { data: partsData, error: pe }] = await Promise.all([
        db.from('video_rooms').select('*').order('created_at', { ascending: false }),
        db.from('video_room_participants').select('*'),
      ]);
      if (re) throw re;
      if (pe) throw pe;
      setRooms((roomsData || []) as VideoRoomRecord[]);
      setParticipants((partsData || []) as VideoParticipantRecord[]);
    } catch (err) {
      console.error('[admin-video]', err);
      toast.error('Impossible de charger les salles.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name');
      if (error) throw error;
      setAllUsers((data || []) as UserProfile[]);
    } catch {}
  };

  useEffect(() => {
    if (!hasVideoAccess) { setLoading(false); return; }
    void loadRooms();
    void loadUsers();

    const channel = db
      .channel('admin-video-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_rooms' }, () => void loadRooms())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_room_participants' }, () => void loadRooms())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [hasVideoAccess]);

  const adminDisplayName = () => {
    const name = user?.name || user?.email || 'Un administrateur';
    if (adminRole === 'admin_principal') return `L'administrateur principal ${name}`;
    return `L'administrateur ${name}`;
  };

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.title.trim()) { toast.error('Titre requis.'); return; }

    setCreating(true);
    try {
      // Upload flyer if selected
      let flyerUrl = formData.flyerUrl.trim() || null;
      if (flyerFile) {
        setUploadingFlyer(true);
        const ext = flyerFile.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('video-flyers').upload(path, flyerFile, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('video-flyers').getPublicUrl(path);
          flyerUrl = urlData.publicUrl;
        }
        setUploadingFlyer(false);
      }

      const { data, error } = await db
        .from('video_rooms')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          created_by: user.id,
          status: formData.scheduledAt ? 'scheduled' : 'waiting',
          room_type: formData.roomType,
          scheduled_at: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
          flyer_url: flyerUrl,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      // Créer une scheduled_session pour que le live apparaisse dans CallsAndLives
      await db.from('scheduled_sessions').insert({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        session_type: formData.roomType === 'audio' ? 'audio' : 'video',
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: new Date().toTimeString().slice(0, 8),
        estimated_duration: 60,
        access_type: 'open',
        recurrence: 'once',
        status: formData.scheduledAt ? 'scheduled' : 'live',
        created_by: user.id,
        video_room_id: data.id,
        ...(flyerUrl ? { thumbnail_url: flyerUrl } : {}),
        ...(formData.scheduledAt ? { scheduled_date: new Date(formData.scheduledAt).toISOString().slice(0, 10), scheduled_time: new Date(formData.scheduledAt).toTimeString().slice(0, 8) } : {}),
      }).catch(() => {});

      // Créer une actualité si un flyer est fourni
      if (flyerUrl) {
        await (supabase as any).from('news_posts').insert({
          title: formData.title.trim(),
          excerpt: formData.description.trim() || `${formData.roomType === 'audio' ? 'Appel audio' : 'Appel vidéo'} en direct`,
          image_url: flyerUrl,
          category: 'event',
          is_published: true,
          featured: false,
          published_at: new Date().toISOString(),
          author_name: user?.email || 'Admin',
        }).then(() => {}, () => {});
      }

      const meetingPath = `/meeting/${data.id}`;
      const callLabel = formData.roomType === 'audio' ? 'audio' : 'vidéo';
      const notifTitle = `📞 ${formData.title.trim()}`;
      const notifBody = `${adminDisplayName()} a lancé un appel ${callLabel}. Rejoins maintenant !`;

      try {
        const selectedIds = callMode === 'select' ? Array.from(selectedUserIds) : undefined;

        // Web Push — reaches devices even when app is closed/background
        void supabase.functions.invoke('send-push-notification', {
          body: {
            title: notifTitle,
            body: notifBody,
            url: meetingPath,
            action: 'call',
            tag: `call-${data.id}`,
            requireInteraction: true,
            vibrate: [400, 200, 400, 200, 600],
            ...(selectedIds ? { user_ids: selectedIds } : {}),
          },
        });

        const targetIds = callMode === 'all'
          ? allUsers.map((u) => u.id)
          : (selectedIds || []);

        if (targetIds.length > 0) {
          const payload = targetIds.map((uid) => ({
            user_id: uid,
            title: notifTitle,
            message: notifBody,
            type: 'call',
            link: meetingPath,
            is_read: false,
          }));
          await supabase.from('notifications').insert(payload);
        }
      } catch (err) {
        console.error('[admin-video] notification error', err);
      }

      toast.success('Salle créée, appel envoyé.');
      setFormData({ title: '', description: '', roomType: 'video', scheduledAt: '', flyerUrl: '' });
      setFlyerFile(null);
      setSelectedUserIds(new Set());
      primeAudioPlayback();
      navigate(meetingPath);
    } catch (err) {
      console.error('[admin-video]', err);
      toast.error('Création échouée.');
    } finally {
      setCreating(false);
    }
  };

  const handleRecall = async (roomId: string, roomTitle: string, roomType: string) => {
    try {
      const notifTitle = `📞 Rappel : ${roomTitle}`;
      const notifBody = `${adminDisplayName()} vous rappelle pour l'appel ${roomType === 'audio' ? 'audio' : 'vidéo'}. Rejoignez maintenant !`;
      const meetingPath = `/meeting/${roomId}`;

      // Web Push — reaches devices even when app is closed/background
      void supabase.functions.invoke('send-push-notification', {
        body: {
          title: notifTitle,
          body: notifBody,
          url: meetingPath,
          action: 'call',
          tag: `call-${roomId}`,
          requireInteraction: true,
          vibrate: [400, 200, 400, 200, 600],
        },
      });

      if (allUsers.length > 0) {
        const payload = allUsers.map((u) => ({
          user_id: u.id,
          title: notifTitle,
          message: notifBody,
          type: 'call',
          link: meetingPath,
          is_read: false,
        }));
        await supabase.from('notifications').insert(payload);
      }
      toast.success('Rappel envoyé à tous');
    } catch {
      toast.error('Rappel échoué');
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    try {
      const { error } = await db
        .from('video_rooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', roomId);
      if (error) throw error;
      toast.success('Salle terminée.');
    } catch { toast.error('Erreur.'); }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    setDeleting(true);
    try {
      await db.from('video_room_participants').delete().eq('room_id', roomToDelete.id);
      await db.from('video_room_messages').delete().eq('room_id', roomToDelete.id);
      await db.from('video_message_reactions').delete().eq('room_id', roomToDelete.id);
      await db.from('video_room_signals').delete().eq('room_id', roomToDelete.id);
      const { error } = await db.from('video_rooms').delete().eq('id', roomToDelete.id);
      if (error) throw error;
      toast.success('Session supprimée définitivement.');
      setRoomToDelete(null);
    } catch (err) {
      console.error('[admin-video] delete error', err);
      toast.error('Suppression échouée.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  if (!hasVideoAccess) {
    return (
      <AdminPageWrapper>
        <div className="min-h-screen flex flex-col bg-background">
          <Navigation />
          <main className="flex-1 container mx-auto px-4 py-8 pt-24">
            <Card><CardHeader><CardTitle>Accès restreint</CardTitle></CardHeader></Card>
          </main>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper>
      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <AlertDialog open={Boolean(roomToDelete)} onOpenChange={(open) => { if (!open) setRoomToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              La session <strong>«&nbsp;{roomToDelete?.title}&nbsp;»</strong> et tous ses messages, réactions et journaux de participants seront supprimés de façon définitive. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteRoom()}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24 space-y-6">
          <div>
            <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-3 px-0">
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" /> Réunions & Appels
            </h1>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Nouvelle réunion</CardTitle>
                <CardDescription>Crée un appel audio ou vidéo et notifie les participants.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Titre</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData((c) => ({ ...c, title: e.target.value }))}
                      placeholder="Réunion de coordination"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={formData.roomType === 'video' ? 'default' : 'outline'} onClick={() => setFormData((c) => ({ ...c, roomType: 'video' }))}>
                        <Video className="h-4 w-4 mr-1" /> Vidéo
                      </Button>
                      <Button type="button" variant={formData.roomType === 'audio' ? 'default' : 'outline'} onClick={() => setFormData((c) => ({ ...c, roomType: 'audio' }))}>
                        <Mic className="h-4 w-4 mr-1" /> Audio
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Qui appeler ?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={callMode === 'all' ? 'default' : 'outline'} onClick={() => setCallMode('all')}>
                        <Users className="h-4 w-4 mr-1" /> Tout le monde
                      </Button>
                      <Button type="button" variant={callMode === 'select' ? 'default' : 'outline'} onClick={() => setCallMode('select')}>
                        <Phone className="h-4 w-4 mr-1" /> Sélection
                      </Button>
                    </div>
                  </div>

                  {callMode === 'select' && (
                    <ScrollArea className="h-40 rounded-lg border border-border p-2">
                      <div className="space-y-1">
                        {allUsers.filter((u) => u.id !== user?.id).map((u) => (
                          <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedUserIds.has(u.id)}
                              onCheckedChange={() => toggleUserSelection(u.id)}
                            />
                            <span>{u.full_name || u.email}</span>
                          </label>
                        ))}
                        {allUsers.length <= 1 && <p className="text-xs text-muted-foreground py-2">Aucun autre utilisateur</p>}
                      </div>
                    </ScrollArea>
                  )}

                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((c) => ({ ...c, description: e.target.value }))}
                    placeholder="Description (optionnel)"
                    rows={2}
                  />

                  {/* Scheduled date/time */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" /> Programmer (optionnel)
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData((c) => ({ ...c, scheduledAt: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  {/* Flyer / cover image */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Image className="h-4 w-4 text-muted-foreground" /> Flyer / visuel (optionnel)
                    </label>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate text-muted-foreground">
                          {flyerFile ? flyerFile.name : 'Choisir une image…'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={(e) => { setFlyerFile(e.target.files?.[0] || null); setFormData((c) => ({ ...c, flyerUrl: '' })); }}
                        />
                      </label>
                      {flyerFile && (
                        <button type="button" onClick={() => setFlyerFile(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                      )}
                    </div>
                    {!flyerFile && (
                      <Input
                        value={formData.flyerUrl}
                        onChange={(e) => setFormData((c) => ({ ...c, flyerUrl: e.target.value }))}
                        placeholder="…ou coller l'URL d'une image"
                        className="text-sm"
                      />
                    )}
                    {(flyerFile || formData.flyerUrl) && (
                      <img
                        src={flyerFile ? URL.createObjectURL(flyerFile) : formData.flyerUrl}
                        alt="Aperçu flyer"
                        className="w-full max-h-40 object-cover rounded-md border border-border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>

                  <Button type="submit" disabled={creating || uploadingFlyer} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    {uploadingFlyer ? 'Upload flyer…' : creating ? 'Création…' : formData.scheduledAt ? 'Programmer' : 'Créer et appeler'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Fonctionnalités</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>✅ Appels audio & vidéo WebRTC</p>
                <p>✅ Sonnerie & notification d'appel entrant</p>
                <p>✅ Rappeler les participants absents</p>
                <p>✅ Appel sélectif ou pour tout le monde</p>
                <p>✅ Chat persistant avec emojis & réactions</p>
                <p>✅ Modification/suppression de messages</p>
                <p>✅ Partage d'écran & rotation caméra</p>
                <p>✅ Contrôle admin : couper le son des participants</p>
                <p>✅ Bannière d'appel actif sur la page d'accueil</p>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Salles existantes</h2>
              <Button variant="outline" size="sm" onClick={() => void loadRooms()} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
              </Button>
            </div>

            {rooms.length === 0 && !loading ? (
              <Card><CardContent className="pt-6 text-muted-foreground text-sm">Aucune salle.</CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {rooms.map((room) => {
                  const count = activeParticipantsByRoom[room.id] || 0;
                  const ended = room.status === 'ended';
                  const live = room.status === 'live';

                  return (
                    <Card key={room.id} className="border-border/70">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{room.title}</CardTitle>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ended ? 'bg-destructive/10 text-destructive' : live ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                            {ended ? 'Terminée' : live ? 'En direct' : 'En attente'}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {room.flyer_url && (
                          <img src={room.flyer_url} alt="flyer" className="w-full max-h-28 object-cover rounded-md" />
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {count}</span>
                          <span>{room.room_type === 'audio' ? '🎙️ Audio' : '📹 Vidéo'}</span>
                          {room.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {new Date(room.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => { primeAudioPlayback(); navigate(`/meeting/${room.id}`); }}>Ouvrir</Button>
                          {!ended && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => void handleRecall(room.id, room.title, room.room_type)}>
                                <Phone className="h-3.5 w-3.5 mr-1" /> Rappeler
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void handleCloseRoom(room.id)}>Terminer</Button>
                            </>
                          )}
                          {ended && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                              onClick={() => setRoomToDelete(room)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </AdminPageWrapper>
  );
};

export default AdminVideo;
