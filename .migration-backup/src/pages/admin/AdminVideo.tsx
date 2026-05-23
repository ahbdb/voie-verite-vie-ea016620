import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';
import { useAdmin } from '@/hooks/useAdmin';
import { broadcastNotificationService } from '@/hooks/useBroadcastNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Phone, Plus, Radio, RefreshCw, Users, Video, Mic } from 'lucide-react';
import type { VideoParticipantRecord, VideoRoomRecord } from '@/hooks/useAdminVideoRoom';

const db = supabase as any;

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

const AdminVideo = () => {
  const navigate = useNavigate();
  const { user, adminRole } = useAdmin();
  const hasVideoAccess = adminRole === 'admin' || adminRole === 'admin_principal';
  const [rooms, setRooms] = useState<VideoRoomRecord[]>([]);
  const [participants, setParticipants] = useState<VideoParticipantRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [callMode, setCallMode] = useState<'all' | 'select'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    roomType: 'video' as 'video' | 'audio',
  });

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
    const name = user?.user_metadata?.full_name || user?.email || 'Un administrateur';
    if (adminRole === 'admin_principal') return `L'administrateur principal ${name}`;
    return `L'administrateur ${name}`;
  };

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.title.trim()) { toast.error('Titre requis.'); return; }

    setCreating(true);
    try {
      const { data, error } = await db
        .from('video_rooms')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          created_by: user.id,
          status: 'waiting',
          room_type: formData.roomType,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      const meetingPath = `/meeting/${data.id}`;
      const callLabel = formData.roomType === 'audio' ? 'audio' : 'vidéo';
      const notifTitle = `📞 ${formData.title.trim()}`;
      const notifBody = `${adminDisplayName()} a lancé un appel ${callLabel}. Rejoins maintenant !`;

      try {
        if (callMode === 'all') {
          await broadcastNotificationService.sendToAll(notifTitle, notifBody, 'call', undefined, meetingPath);
        } else {
          // Send only to selected users
          const ids = Array.from(selectedUserIds);
          if (ids.length > 0) {
            const payload = ids.map((uid) => ({
              user_id: uid,
              title: notifTitle,
              message: notifBody,
              type: 'call',
              link: meetingPath,
              is_read: false,
            }));
            await supabase.from('notifications').insert(payload);
          }
        }
      } catch (err) {
        console.error('[admin-video] notification error', err);
      }

      toast.success('Salle créée, appel envoyé.');
      setFormData({ title: '', description: '', roomType: 'video' });
      setSelectedUserIds(new Set());
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
      await broadcastNotificationService.sendToAll(notifTitle, notifBody, 'call', undefined, `/meeting/${roomId}`);
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
                  <Button type="submit" disabled={creating} className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> {creating ? 'Création...' : 'Créer et appeler'}
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {count}</span>
                          <span>{room.room_type === 'audio' ? '🎙️ Audio' : '📹 Vidéo'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" asChild><Link to={`/meeting/${room.id}`}>Ouvrir</Link></Button>
                          {!ended && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => void handleRecall(room.id, room.title, room.room_type)}>
                                <Phone className="h-3.5 w-3.5 mr-1" /> Rappeler
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void handleCloseRoom(room.id)}>Terminer</Button>
                            </>
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
