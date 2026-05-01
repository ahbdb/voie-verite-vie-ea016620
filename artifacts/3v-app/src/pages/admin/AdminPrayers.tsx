import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2, ArrowLeft, MessageSquare, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  is_anonymous: boolean;
  prayer_count: number;
  created_at: string;
  user_id: string | null;
}

const AdminPrayers = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadPrayers();
    }
  }, [isAdmin]);

  const loadPrayers = async () => {
    const { data } = await supabase
      .from('prayer_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPrayers(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette demande de prière ?')) {
      await supabase.from('prayer_requests').delete().eq('id', id);
      toast.success('Demande supprimée');
      loadPrayers();
    }
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

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <MessageSquare className="h-6 w-6" /> Modération Forum Prière
        </h1>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Anonyme</TableHead>
                  <TableHead>Prières</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prayers.map((prayer) => (
                  <TableRow key={prayer.id}>
                    <TableCell className="font-medium">{prayer.title}</TableCell>
                    <TableCell>{prayer.is_anonymous ? 'Oui' : 'Non'}</TableCell>
                    <TableCell>{prayer.prayer_count}</TableCell>
                    <TableCell>{new Date(prayer.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPrayer(prayer)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(prayer.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selectedPrayer} onOpenChange={() => setSelectedPrayer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPrayer?.title}</DialogTitle>
            </DialogHeader>
            <div>
              <p className="text-muted-foreground whitespace-pre-wrap">{selectedPrayer?.content}</p>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminPrayers;
