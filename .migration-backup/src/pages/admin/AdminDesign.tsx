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
import { ArrowLeft, Palette, Save } from 'lucide-react';

interface PageContent {
  id: string;
  page_key: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown> | null;
}

const AdminDesign = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: '',
    accent_color: '',
    footer_text: ''
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
      .eq('page_key', 'design')
      .single();

    if (data) {
      setPageContent(data as PageContent);
      const content = (data.content as Record<string, unknown>) || {};
      setFormData({
        logo_url: (content.logo_url as string) || '',
        primary_color: (content.primary_color as string) || '',
        accent_color: (content.accent_color as string) || '',
        footer_text: (content.footer_text as string) || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updateData = {
      title: null,
      subtitle: null,
      content: {
        logo_url: formData.logo_url,
        primary_color: formData.primary_color,
        accent_color: formData.accent_color,
        footer_text: formData.footer_text
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
        .insert({ ...updateData, page_key: 'design' });

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
          <Palette className="h-6 w-6" /> Gestion du Design
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres visuels</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Logo (URL)</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://.../logo.png"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Couleur primaire</Label>
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    placeholder="#0ea5a4"
                  />
                </div>
                <div>
                  <Label>Couleur d'accent</Label>
                  <Input
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    placeholder="#7c3aed"
                  />
                </div>
              </div>

              <div>
                <Label>Texte du footer</Label>
                <Textarea
                  value={formData.footer_text}
                  onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                  placeholder="© Voie, Vérité, Vie"
                  rows={3}
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

export default AdminDesign;
