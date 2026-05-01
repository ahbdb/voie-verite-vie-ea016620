import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AdminTestSave = () => {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useAdmin();
  const [testValue, setTestValue] = useState('Test data - ' + new Date().toISOString());
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  const testSaveCareme = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      console.log('🧪 [Test] Starting UPSERT test for careme-2026');
      console.log('👤 [Test] Current user:', user?.id, user?.email);

      // First,check if user is truly admin
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id);
      
      console.log('🔍 [Test] User roles check:', userRoles, roleError);

      // Try UPSERT (will insert or update)
      const testData = {
        page_key: 'careme-2026',
        title: 'Carême 2026 TEST',
        subtitle: `Test save at ${new Date().toLocaleTimeString()}`,
        content: {
          test_marker: testValue,
          days: [
            {
              date: 'Mercredi 18 février',
              title: 'Mercredi des Cendres',
              readings:  'Jl 2,12-18 / Ps 50 / 2 Co 5,20-6,2 / Mt 6,1-6.16-18',
              actions: {
                soi: 'Test soi action - ' + testValue,
                prochain: 'Test prochain action',
                dieu: 'Test dieu action'
              },
              weekTitle: 'Semaine 1'
            }
          ]
        }
      };

      console.log('📝 [Test] Attempting UPSERT with data:', testData);

      // Delete first to ensure clean state
      const { error: deleteErr } = await supabase
        .from('page_content')
        .delete()
        .eq('page_key', 'careme-2026');
      
      console.log('🗑️ [Test] Delete result:', deleteErr);

      // Now insert fresh
      const { data: result, error } = await supabase
        .from('page_content')
        .insert([testData])
        .select()
        .single();

      if (error) {
        console.error('❌ [Test] Error:', error);
        setTestResult({
          success: false,
          error: error.message,
          details: error
        });
        toast.error('Test failed: ' + error.message);
        return;
      }

      console.log('✅ [Test] Insert successful:', result);
      setTestResult({
        success: true,
        data: result,
        message: 'Data saved successfully!'
      });
      
      toast.success('Test save successful! Check page now.');
    } catch (err) {
      console.error('❌ [Test] Exception:', err);
      setTestResult({
        success: false,
        error: String(err)
      });
      toast.error('Test error: ' + String(err));
    } finally {
      setTesting(false);
    }
  };

  const verifyCareme = async () => {
    try {
      setTesting(true);
 
      console.log('🔍 [Verify] Fetching careme-2026...');
      const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .eq('page_key', 'careme-2026')
        .single();

      if (error) {
        console.warn('⚠️ [Verify] Error:', error);
        setTestResult({
          success: false,
          error: error.message
        });
        return;
      }

      console.log('✅ [Verify] Data:', data);
      const contentObj = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
      const daysCount = (contentObj?.days as any[])?.length || 0;
      
      setTestResult({
        success: true,
        data: data,
        daysCount: daysCount
      });

      toast.success(`Found ${daysCount} days in database`);
    } catch (err) {
      console.error('❌ [Verify] Exception:', err);
      setTestResult({
        success: false,
        error: String(err)
      });
    } finally {
      setTesting(false);
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

        <h1 className="text-3xl font-bold mb-6">🧪 Test Save Carême</h1>

        <div className="grid gap-4 mb-6">
          <div>
            <label className="text-sm font-medium">Test Value</label>
            <Input
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="Custom test message"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={testSaveCareme} disabled={testing} className="w-full bg-blue-600">
              {testing ? 'Testing...' : '💾 Test Save Careme'}
            </Button>
            <Button onClick={verifyCareme} disabled={testing} className="w-full bg-green-600">
              {testing ? 'Verifying...' : '🔍 Verify DB'}
            </Button>
          </div>
        </div>

        {testResult && (
          <Card className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader>
              <CardTitle className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                {testResult.success ? '✅ Success' : '❌ Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResult.message && <p className="text-sm">{testResult.message}</p>}
                {testResult.daysCount !== undefined && (
                  <p className="text-sm font-mono">Days in DB: {testResult.daysCount}</p>
                )}
                {testResult.error && (
                  <p className="text-xs text-red-600 font-mono">{testResult.error}</p>
                )}
                {testResult.data && (
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminTestSave;
