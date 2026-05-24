import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Heart, DollarSign, TrendingUp, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const db = supabase as any;

type DonStatus = 'pending' | 'confirmed' | 'failed';

interface Donation {
  id: string;
  amount: number;
  currency: string;
  donor_name: string | null;
  donor_email: string | null;
  user_id: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  confirmed: { label: 'Confirmé',    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  failed:    { label: 'Échoué',      color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const parseMessage = (msg: string | null) => {
  try {
    return msg ? JSON.parse(msg) : {};
  } catch {
    return {};
  }
};

const CAUSE_LABELS: Record<string, string> = {
  general:        '🙏 Soutien général',
  jeunesse:       '✨ Jeunesse & Formation',
  evangelisation: '📖 Évangélisation',
  pauvres:        '🤝 Aide aux pauvres',
};

const METHOD_LABELS: Record<string, string> = {
  orange: '🟠 Orange Money',
  mtn:    '🟡 MTN MoMo',
  moov:   '🔵 Moov Money',
  iban:   '🏦 Virement IBAN',
};

const AdminDons = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected] = useState<Donation | null>(null);
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
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('AdminDons load error:', error);
      toast.error('Erreur de chargement des dons.');
    }
    if (data) setDonations(data as Donation[]);
    setFetching(false);
  };

  const updateStatus = async (id: string, status: DonStatus) => {
    setUpdating(id);
    const { error } = await db.from('donations').update({ status }).eq('id', id);
    if (error) {
      toast.error('Erreur lors de la mise à jour.');
    } else {
      toast.success('Statut du don mis à jour.');
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    }
    setUpdating(null);
  };

  const displayed = filterStatus === 'all'
    ? donations
    : donations.filter((d) => d.status === filterStatus);

  const totalConfirmed = donations
    .filter((d) => d.status === 'confirmed')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalPending = donations
    .filter((d) => d.status === 'pending')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const fmtAmt = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR')} ${currency}`;

  if (loading) return <AdminLoadingSpinner />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Heart className="h-6 w-6 text-primary" /> Gestion des Dons & Offrandes
        </h1>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Total confirmé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{totalConfirmed.toLocaleString('fr-FR')} XAF</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{totalPending.toLocaleString('fr-FR')} XAF</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Donateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{donations.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(['all', 'pending', 'confirmed', 'failed'] as const).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className="text-xs"
            >
              {s === 'all' ? 'Tous' : STATUS_CFG[s]?.label ?? s}
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-bold">
                {s === 'all' ? donations.length : donations.filter((d) => d.status === s).length}
              </span>
            </Button>
          ))}
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Aucun don dans cette catégorie.</p>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donateur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((d) => {
                    const meta = parseMessage(d.message);
                    const statusCfg = STATUS_CFG[d.status] ?? { label: d.status, color: 'bg-muted text-muted-foreground border-border' };
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          <div className="text-sm">{d.donor_name ?? 'Anonyme'}</div>
                          {d.donor_email && <div className="text-xs text-muted-foreground">{d.donor_email}</div>}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {fmtAmt(d.amount, d.currency)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {CAUSE_LABELS[meta.cause] ?? meta.cause ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {METHOD_LABELS[meta.method] ?? meta.method ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs rounded-full ${statusCfg.color}`}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(d.created_at), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" title="Voir" onClick={() => setSelected(d)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {d.status !== 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                title="Confirmer"
                                className="text-emerald-600 hover:bg-emerald-50 text-xs px-2"
                                disabled={updating === d.id}
                                onClick={() => updateStatus(d.id, 'confirmed')}
                              >
                                ✓
                              </Button>
                            )}
                            {d.status !== 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                title="Marquer échoué"
                                className="text-red-500 hover:bg-red-50 text-xs px-2"
                                disabled={updating === d.id}
                                onClick={() => updateStatus(d.id, 'failed')}
                              >
                                ✗
                              </Button>
                            )}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Détail du don</DialogTitle>
            </DialogHeader>
            {selected && (() => {
              const meta = parseMessage(selected.message);
              const sc = STATUS_CFG[selected.status] ?? { label: selected.status, color: '' };
              return (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Montant</p>
                      <p className="font-bold text-lg text-foreground">{fmtAmt(selected.amount, selected.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Statut</p>
                      <Badge variant="outline" className={`text-xs rounded-full ${sc.color}`}>{sc.label}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Donateur</p>
                    <p className="font-medium">{selected.donor_name ?? 'Anonyme'}</p>
                    {selected.donor_email && <p className="text-muted-foreground text-xs">{selected.donor_email}</p>}
                  </div>
                  {meta.cause && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Cause</p>
                      <p>{CAUSE_LABELS[meta.cause] ?? meta.cause}</p>
                    </div>
                  )}
                  {meta.method && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Méthode</p>
                      <p>{METHOD_LABELS[meta.method] ?? meta.method}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Date</p>
                    <p>{format(new Date(selected.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {selected.status !== 'confirmed' && (
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                        disabled={updating === selected.id}
                        onClick={() => updateStatus(selected.id, 'confirmed')}
                      >
                        ✓ Confirmer
                      </Button>
                    )}
                    {selected.status !== 'pending' && (
                      <Button
                        variant="outline"
                        className="flex-1 text-sm"
                        disabled={updating === selected.id}
                        onClick={() => updateStatus(selected.id, 'pending')}
                      >
                        Remettre en attente
                      </Button>
                    )}
                    {selected.status !== 'failed' && (
                      <Button
                        variant="outline"
                        className="flex-1 text-red-500 border-red-200 text-sm"
                        disabled={updating === selected.id}
                        onClick={() => updateStatus(selected.id, 'failed')}
                      >
                        ✗ Échoué
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDons;
