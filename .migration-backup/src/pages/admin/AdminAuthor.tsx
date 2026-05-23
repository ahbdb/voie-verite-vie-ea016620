import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, User, Save } from 'lucide-react';

interface PageContent {
  id: string;
  page_key: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown> | null;
}

const AdminAuthor = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [formData, setFormData] = useState({
    author_name: '',
    author_bio: '',
    author_photo_url: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) loadContent();
  }, [isAdmin]);

  const loadContent = async () => {
    const { data } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'author')
      .single();

    if (data) {
      setPageContent(data as PageContent);
      const content = (data.content as Record<string, unknown>) || {};
      setFormData({
        author_name: (content.author_name as string) || '',
        author_bio: (content.author_bio as string) || '',
        author_photo_url: (content.author_photo_url as string) || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updateData = {
      title: formData.author_name,
      subtitle: null,
      content: {
        author_name: formData.author_name,
        author_bio: formData.author_bio,
        author_photo_url: formData.author_photo_url
      },
      updated_at: new Date().toISOString()
    };

    if (pageContent) {
      const { error } = await supabase
        .from('page_content')
        .update(updateData)
        .eq('id', pageContent.id);

      if (error) {
        toast.error('Erreur lors de la sauvegarde');
      } else {
        toast.success('Contenu sauvegardé');
      }
    } else {
      const { error } = await supabase
        .from('page_content')
        .insert({ ...updateData, page_key: 'author' });

      if (error) {
        toast.error('Erreur lors de la création');
      } else {
        toast.success('Contenu créé');
        loadContent();
      }
    }

    setSaving(false);
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
          <User className="h-6 w-6" /> Gestion de la Page Auteur
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Informations sur l'auteur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Nom de l'auteur</Label>
                <Input
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  placeholder="AHOUFACK Dylanne Baudouin"
                />
              </div>

              <div>
                <Label>Bio / Présentation</Label>
                <Textarea
                  value={formData.author_bio}
                  onChange={(e) => setFormData({ ...formData, author_bio: e.target.value })}
                  placeholder="Courte biographie"
                  rows={6}
                />
              </div>

              <div>
                <Label>URL de la photo</Label>
                <Input
                  value={formData.author_photo_url}
                  onChange={(e) => setFormData({ ...formData, author_photo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAuthor;
