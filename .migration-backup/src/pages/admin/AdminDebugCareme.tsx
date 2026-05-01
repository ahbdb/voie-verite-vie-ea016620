import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const AdminDebugCareme = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [dbData, setDbData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    checkDatabase();
  }, [isAdmin]);

  const checkDatabase = async () => {
    try {
      setChecking(true);
      setError('');
      
      console.log('🔍 [Debug] Fetching careme-2026 data from page_content...');
      const { data, error: fetchError } = await supabase
        .from('page_content')
        .select('*')
        .eq('page_key', 'careme-2026')
        .single();

      if (fetchError) {
        console.error('❌ [Debug] Fetch error:', fetchError);
        setError(`Erreur: ${fetchError.message}`);
        setDbData(null);
      } else {
        console.log('✅ [Debug] Data fetched:', data);
        setDbData(data);
      }
    } catch (err) {
      console.error('❌ [Debug] Exception:', err);
      setError(String(err));
      setDbData(null);
    } finally {
      setChecking(false);
    }
  };

  const insertTestData = async () => {
    try {
      setChecking(true);
      
      const testData = {
        page_key: 'careme-2026',
        title: 'Carême 2026 - TEST',
        subtitle: 'Test data',
        content: {
          days: [
            {
              date: 'Mercredi 18 février',
              title: 'Mercredi des Cendres',
              readings: 'Test reading',
              actions: {
                soi: 'Test soi action',
                prochain: 'Test prochain action',
                dieu: 'Test dieu action'
              },
              weekTitle: 'Semaine 1'
            }
          ]
        },
        updated_at: new Date().toISOString()
      };

      console.log('💾 [Debug] Inserting test data:', testData);
      
      // Try to delete existing first
      await supabase
        .from('page_content')
        .delete()
        .eq('page_key', 'careme-2026');

      // Then insert
      const { data, error } = await supabase
        .from('page_content')
        .insert([testData])
        .select()
        .single();

      if (error) {
        console.error('❌ [Debug] Insert error:', error);
        setError(`Insert error: ${error.message}`);
      } else {
        console.log('✅ [Debug] Data inserted:', data);
        setDbData(data);
        alert('Test data inserted successfully!');
      }
    } catch (err) {
      console.error('❌ [Debug] Exception:', err);
      setError(String(err));
    } finally {
      setChecking(false);
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

        <h1 className="text-3xl font-bold mb-6">🔍 Debug Carême 2026</h1>

        <div className="grid gap-4 mb-6">
          <Button onClick={checkDatabase} disabled={checking} className="w-full">
            {checking ? 'Vérification...' : 'Vérifier la base de données'}
          </Button>
          <Button onClick={insertTestData} disabled={checking} variant="outline" className="w-full">
            Insérer des données de test
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">❌ Erreur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {dbData && (
          <Card>
            <CardHeader>
              <CardTitle>📊 Données en Base de Données</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-sm mb-1">ID:</p>
                  <p className="text-sm bg-gray-100 p-2 rounded font-mono">{dbData.id}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">page_key:</p>
                  <p className="text-sm bg-gray-100 p-2 rounded font-mono">{dbData.page_key}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">title:</p>
                  <p className="text-sm bg-gray-100 p-2 rounded font-mono">{dbData.title}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">subtitle:</p>
                  <p className="text-sm bg-gray-100 p-2 rounded font-mono">{dbData.subtitle}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">content (JSON):</p>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
                    {JSON.stringify(dbData.content, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">content.days count:</p>
                  <p className="text-sm bg-gray-100 p-2 rounded font-mono">
                    {dbData.content?.days?.length || 0} jour(s)
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">updated_at:</p>
                  <p className="text-sm bg-gray-100 p-2 rounded font-mono">{dbData.updated_at}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!dbData && !error && !checking && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-700">⚠️ Pas de données trouvées</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-600">
                La table page_content ne contient pas de données pour la clé 'careme-2026'.
                Cliquez sur "Insérer des données de test" pour en ajouter.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminDebugCareme;
