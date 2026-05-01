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
import { ArrowLeft, Info, Save } from 'lucide-react';

interface PageContent {
  id: string;
  page_key: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown> | null;
}

const AdminAbout = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    founder: '',
    vision: '',
    history: '',
    mission: ''
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
      .eq('page_key', 'about')
      .single();
    
    if (data) {
      setPageContent(data as PageContent);
      const content = (data.content as Record<string, unknown>) || {};
      setFormData({
        title: data.title || '',
        subtitle: data.subtitle || '',
        founder: (content.founder as string) || '',
        vision: (content.vision as string) || '',
        history: (content.history as string) || '',
        mission: (content.mission as string) || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const contentData = {
      founder: formData.founder,
      vision: formData.vision,
      history: formData.history,
      mission: formData.mission
    };

    try {
      const { error: rpcError } = await supabase.rpc('update_page_content_data', {
        p_page_key: 'about',
        p_content: contentData
      });

      if (rpcError) {
        toast.error('Erreur lors de la sauvegarde');
        console.error('RPC Error:', rpcError);
      } else {
        toast.success('Contenu sauvegardé');
        await loadContent();
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
      console.error('Error:', err);
    } finally {
      setSaving(false);
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
          <Info className="h-6 w-6" /> Gestion de la Page À Propos
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Contenu de la page À Propos</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="À Propos"
                  />
                </div>
                <div>
                  <Label>Sous-titre</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                    placeholder="Notre histoire et notre mission"
                  />
                </div>
              </div>

              <div>
                <Label>Fondateur</Label>
                <Input
                  value={formData.founder}
                  onChange={(e) => setFormData({...formData, founder: e.target.value})}
                  placeholder="AHOUFACK Dylanne Baudouin"
                />
              </div>

              <div>
                <Label>Vision</Label>
                <Textarea
                  value={formData.vision}
                  onChange={(e) => setFormData({...formData, vision: e.target.value})}
                  placeholder="Notre vision pour la communauté..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Histoire</Label>
                <Textarea
                  value={formData.history}
                  onChange={(e) => setFormData({...formData, history: e.target.value})}
                  placeholder="L'histoire de VOIE, VÉRITÉ, VIE..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Mission</Label>
                <Textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({...formData, mission: e.target.value})}
                  placeholder="Notre mission est d'accompagner..."
                  rows={4}
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

export default AdminAbout;