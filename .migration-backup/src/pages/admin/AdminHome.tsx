import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { ArrowLeft, Home, Save } from 'lucide-react';

interface PageContent {
  id: string;
  page_key: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown> | null;
}

const AdminHome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    hero_text: '',
    mission_text: ''
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
      .eq('page_key', 'home')
      .single();
    
    if (data) {
      setPageContent(data as PageContent);
      const content = (data.content as Record<string, unknown>) || {};
      setFormData({
        title: data.title || '',
        subtitle: data.subtitle || '',
        hero_text: (content.hero_text as string) || '',
        mission_text: (content.mission_text as string) || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const contentData = {
      hero_text: formData.hero_text,
      mission_text: formData.mission_text
    };

    try {
      const { error: rpcError } = await supabase.rpc('update_page_content_data', {
        p_page_key: 'home',
        p_content: contentData
      });

      if (rpcError) {
        toast.error(t('admin.saveError'));
        console.error('RPC Error:', rpcError);
      } else {
        toast.success(t('admin.saved'));
        await loadContent();
      }
    } catch (err) {
      toast.error(t('admin.genericError'));
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
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('admin.back')}
        </Button>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Home className="h-6 w-6" /> {t('admin.homePage.title')}
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.homePage.content')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>{t('admin.homePage.mainTitle')}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Voie, Vérité, Vie"
                />
              </div>
              
              <div>
                <Label>{t('admin.homePage.subtitle')}</Label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                />
              </div>

              <div>
                <Label>{t('admin.homePage.heroText')}</Label>
                <Textarea
                  value={formData.hero_text}
                  onChange={(e) => setFormData({...formData, hero_text: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label>{t('admin.homePage.missionText')}</Label>
                <Textarea
                  value={formData.mission_text}
                  onChange={(e) => setFormData({...formData, mission_text: e.target.value})}
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? t('admin.saving') : t('admin.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminHome;