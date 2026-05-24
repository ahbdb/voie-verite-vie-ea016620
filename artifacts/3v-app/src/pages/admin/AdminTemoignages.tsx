import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Heart, Eye, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const db = supabase as any;

type TestimonialStatus = 'pending' | 'published' | 'rejected';

interface Testimonial {
  id: string;
  titre: string;
  recit: string;
  categorie: string;
  prenom: string | null;
  anonymous: boolean;
  status: TestimonialStatus;
  created_at: string;
  user_id: string | null;
}

const STATUS_LABELS: Record<TestimonialStatus, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  published: { label: 'Publié',      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  rejected:  { label: 'Rejeté',      color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const CAT_LABELS: Record<string, string> = {
  guerison:   '🙏 Guérison',
  conversion: '✨ Conversion',
  famille:    '👨‍👩‍👧 Famille',
  travail:    '💼 Travail',
  foi:        '🕊️ Foi',
  autre:      '🌿 Autre',
};

const AdminTemoignages = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TestimonialStatus | 'all'>('pending');
  const [selected, setSelected] = useState<Testimonial | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const load = async () => {
    setFetching(true);
    const { data, error } = await db
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('AdminTemoignages load error:', error);
      toast.error('Erreur de chargement. Vérifiez que la migration SQL testimonials a été exécutée.');
    }
    if (data) setTestimonials(data as Testimonial[]);
    setFetching(false);
  };

  const updateStatus = async (id: string, status: TestimonialStatus) => {
    setUpdating(id);
    const { error } = await db.from('testimonials').update({ status }).eq('id', id);
    if (error) {
      toast.error('Erreur lors de la mise à jour.');
    } else {
      toast.success(status === 'published' ? '✅ Témoignage publié !' : status === 'rejected' ? '❌ Témoignage rejeté.' : 'Statut mis à jour.');
      setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    }
    setUpdating(null);
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm('Supprimer définitivement ce témoignage ?')) return;
    const { error } = await db.from('testimonials').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression.');
    } else {
      toast.success('Témoignage supprimé.');
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      setSelected(null);
    }
  };

  const displayed = filterStatus === 'all'
    ? testimonials
    : testimonials.filter((t) => t.status === filterStatus);

  const counts = {
    all: testimonials.length,
    pending: testimonials.filter((t) => t.status === 'pending').length,
    published: testimonials.filter((t) => t.status === 'published').length,
    rejected: testimonials.filter((t) => t.status === 'rejected').length,
  };

  if (loading) return <AdminLoadingSpinner />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" /> Modération des Témoignages
          </h1>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'published', 'rejected'] as const).map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(s)}
                className="text-xs"
              >
                {s === 'all' ? 'Tous' : STATUS_LABELS[s].label}
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-bold">
                  {counts[s]}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Aucun témoignage dans cette catégorie.</p>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((t) => {
                    const s = STATUS_LABELS[t.status];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{t.titre}</TableCell>
                        <TableCell className="text-sm">{CAT_LABELS[t.categorie] ?? t.categorie}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.anonymous || !t.prenom ? 'Anonyme' : t.prenom}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs rounded-full ${s.color}`}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(t.created_at), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" title="Voir" onClick={() => setSelected(t)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {t.status !== 'published' && (
                              <Button
                                size="sm"
                                variant="outline"
                                title="Publier"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                disabled={updating === t.id}
                                onClick={() => updateStatus(t.id, 'published')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {t.status !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                title="Rejeter"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                disabled={updating === t.id}
                                onClick={() => updateStatus(t.id, 'rejected')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              title="Supprimer"
                              onClick={() => deleteTestimonial(t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-8">{selected?.titre}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs rounded-full ${STATUS_LABELS[selected.status].color}`}>
                    {STATUS_LABELS[selected.status].label}
                  </Badge>
                  <Badge variant="outline" className="text-xs rounded-full">
                    {CAT_LABELS[selected.categorie] ?? selected.categorie}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selected.anonymous || !selected.prenom ? 'Anonyme' : selected.prenom}
                    {' · '}
                    {format(new Date(selected.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground bg-muted/30 rounded-xl p-4">
                  {selected.recit}
                </p>

                <div className="flex gap-2 flex-wrap pt-2">
                  {selected.status !== 'published' && (
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={updating === selected.id}
                      onClick={() => updateStatus(selected.id, 'published')}
                    >
                      <Check className="h-4 w-4 mr-2" /> Publier
                    </Button>
                  )}
                  {selected.status !== 'rejected' && (
                    <Button
                      variant="outline"
                      className="flex-1 text-amber-600 border-amber-300"
                      disabled={updating === selected.id}
                      onClick={() => updateStatus(selected.id, 'rejected')}
                    >
                      <X className="h-4 w-4 mr-2" /> Rejeter
                    </Button>
                  )}
                  {selected.status === 'published' && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={updating === selected.id}
                      onClick={() => updateStatus(selected.id, 'pending')}
                    >
                      Remettre en attente
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteTestimonial(selected.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminTemoignages;
