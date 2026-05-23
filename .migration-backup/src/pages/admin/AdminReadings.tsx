import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowLeft, BookOpen } from 'lucide-react';

interface Reading {
  id: string;
  day_number: number;
  date: string;
  books: string;
  chapters: string;
  chapters_count: number;
  type: string;
  comment: string | null;
}

const AdminReadings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<Reading | null>(null);
  const [formData, setFormData] = useState({
    day_number: '',
    date: '',
    books: '',
    chapters: '',
    chapters_count: '',
    type: 'regular',
    comment: ''
  });

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadReadings();
    }
  }, [isAdmin]);

  const loadReadings = async () => {
    const { data } = await supabase
      .from('biblical_readings')
      .select('*')
      .order('day_number', { ascending: true })
      .limit(100);
    if (data) setReadings(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const readingData = {
      day_number: parseInt(formData.day_number),
      date: formData.date,
      books: formData.books,
      chapters: formData.chapters,
      chapters_count: parseInt(formData.chapters_count),
      type: formData.type,
      comment: formData.comment || null,
      month: new Date(formData.date).getMonth() + 1,
      year: new Date(formData.date).getFullYear()
    };

    if (editingReading) {
      const { error } = await supabase.from('biblical_readings').update(readingData).eq('id', editingReading.id);
      if (error) {
        console.error('❌ Update reading error:', error);
        toast.error('Erreur: ' + error.message);
      } else {
        console.log('✅ Lecture modifiée');
        toast.success('Lecture modifiée');
      }
    } else {
      const { error } = await supabase.from('biblical_readings').insert(readingData);
      if (error) {
        console.error('❌ Insert reading error:', error);
        toast.error('Erreur: ' + error.message);
      } else {
        console.log('✅ Lecture ajoutée');
        toast.success('Lecture ajoutée');
      }
    }
    
    setIsDialogOpen(false);
    resetForm();
    loadReadings();
  };

  const handleEdit = (reading: Reading) => {
    setEditingReading(reading);
    setFormData({
      day_number: reading.day_number.toString(),
      date: reading.date,
      books: reading.books,
      chapters: reading.chapters,
      chapters_count: reading.chapters_count.toString(),
      type: reading.type,
      comment: reading.comment || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette lecture ?')) {
      const { error } = await supabase.from('biblical_readings').delete().eq('id', id);
      if (error) {
        console.error('❌ Delete reading error:', error);
        toast.error('Erreur: ' + error.message);
      } else {
        console.log('✅ Lecture supprimée');
        toast.success('Lecture supprimée');
        loadReadings();
      }
    }
  };

  const resetForm = () => {
    setEditingReading(null);
    setFormData({ day_number: '', date: '', books: '', chapters: '', chapters_count: '', type: 'regular', comment: '' });
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

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Gestion des Lectures Bibliques
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingReading ? 'Modifier' : 'Ajouter'} une lecture</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Jour N°" type="number" value={formData.day_number} onChange={(e) => setFormData({...formData, day_number: e.target.value})} required />
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                </div>
                <Input placeholder="Livres (ex: Genèse)" value={formData.books} onChange={(e) => setFormData({...formData, books: e.target.value})} required />
                <Input placeholder="Chapitres (ex: 1-3)" value={formData.chapters} onChange={(e) => setFormData({...formData, chapters: e.target.value})} required />
                <Input placeholder="Nombre de chapitres" type="number" value={formData.chapters_count} onChange={(e) => setFormData({...formData, chapters_count: e.target.value})} required />
                <Textarea placeholder="Commentaire (optionnel)" value={formData.comment} onChange={(e) => setFormData({...formData, comment: e.target.value})} />
                <Button type="submit" className="w-full">{editingReading ? 'Modifier' : 'Ajouter'}</Button>
              </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jour</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Livres</TableHead>
                  <TableHead>Chapitres</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((reading) => (
                  <TableRow key={reading.id}>
                    <TableCell>{reading.day_number}</TableCell>
                    <TableCell>{reading.date}</TableCell>
                    <TableCell>{reading.books}</TableCell>
                    <TableCell>{reading.chapters}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(reading)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(reading.id)}>
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
      </main>
    </div>
  );
};

export default AdminReadings;
