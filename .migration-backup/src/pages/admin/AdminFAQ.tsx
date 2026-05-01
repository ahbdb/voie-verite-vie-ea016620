import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, HelpCircle, Plus, Pencil, Trash2 } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: boolean;
}

const AdminFAQ = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'general',
    sort_order: 0,
    is_published: true
  });

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) loadFAQ();
  }, [isAdmin]);

  const loadFAQ = async () => {
    const { data } = await supabase
      .from('faq_items')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setFaqItems(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      const { error } = await supabase
        .from('faq_items')
        .update(formData)
        .eq('id', editingItem.id);
      if (error) {
        toast.error('Erreur lors de la modification');
      } else {
        toast.success('Question modifiée');
      }
    } else {
      const { error } = await supabase
        .from('faq_items')
        .insert(formData);
      if (error) {
        toast.error('Erreur lors de l\'ajout');
      } else {
        toast.success('Question ajoutée');
      }
    }
    
    setIsDialogOpen(false);
    resetForm();
    loadFAQ();
  };

  const handleEdit = (item: FAQItem) => {
    setEditingItem(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      category: item.category,
      sort_order: item.sort_order,
      is_published: item.is_published
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette question ?')) {
      await supabase.from('faq_items').delete().eq('id', id);
      toast.success('Question supprimée');
      loadFAQ();
    }
  };

  const togglePublished = async (item: FAQItem) => {
    await supabase
      .from('faq_items')
      .update({ is_published: !item.is_published })
      .eq('id', item.id);
    loadFAQ();
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ question: '', answer: '', category: 'general', sort_order: 0, is_published: true });
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
            <HelpCircle className="h-6 w-6" /> Gestion de la FAQ
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Modifier' : 'Ajouter'} une question</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Question</Label>
                  <Input
                    value={formData.question}
                    onChange={(e) => setFormData({...formData, question: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Réponse</Label>
                  <Textarea
                    value={formData.answer}
                    onChange={(e) => setFormData({...formData, answer: e.target.value})}
                    rows={5}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Catégorie</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Ordre d'affichage</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({...formData, is_published: checked})}
                  />
                  <Label>Publié</Label>
                </div>
                <Button type="submit" className="w-full">{editingItem ? 'Modifier' : 'Ajouter'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Publié</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sort_order}</TableCell>
                    <TableCell className="font-medium max-w-md truncate">{item.question}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <Switch checked={item.is_published} onCheckedChange={() => togglePublished(item)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
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

export default AdminFAQ;