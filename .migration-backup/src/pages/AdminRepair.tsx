import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const SQL_REPAIR_SCRIPT = `-- Restore admin_principal role for ahdybau@gmail.com
BEGIN;

-- Delete old roles if any exist
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com');

-- Insert admin_principal role
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin_principal', NOW(), NOW() 
FROM auth.users 
WHERE email = 'ahdybau@gmail.com';

COMMIT;

-- Verify
SELECT u.email, ur.role 
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';`;

export default function AdminRepairPage() {
  const [email, setEmail] = useState('ahdybau@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const checkAndRepair = async () => {
    setLoading(true);
    setResult(null);

    try {
      // 1. Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setResult({
          success: false,
          message: '❌ Not logged in. Please login first.',
        });
        setLoading(false);
        return;
      }

      // 2. Query user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', session.user.id);

      if (rolesError) {
        setResult({
          success: false,
          message: `❌ Database error: ${rolesError.message}`,
        });
        setLoading(false);
        return;
      }

      const currentRole = (roles && roles.length > 0 ? roles[0].role : null) as string | null;
      const details = {
        userId: session.user.id,
        email: session.user.email,
        currentRole: currentRole,
        foundRoles: roles?.length || 0,
      };

      if (currentRole === 'admin_principal') {
        setResult({
          success: true,
          message: '✅ You are admin_principal! No repair needed.',
          details,
        });
        setLoading(false);
        return;
      }

      // 3. Role is missing or wrong - need to fix via Supabase Dashboard
      setResult({
        success: false,
        message: `⚠️ Your admin role is missing or incorrect (current: ${currentRole || 'NONE'})`,
        details: {
          ...details,
          instruction: 'USE_SUPABASE_DASHBOARD',
        },
      });

    } catch (error) {
      setResult({
        success: false,
        message: `❌ Error: ${String(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_REPAIR_SCRIPT);
    toast.success('SQL script copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Admin Role Restoration
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="check" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="check">Check Status</TabsTrigger>
              <TabsTrigger value="repair">Repair via Dashboard</TabsTrigger>
            </TabsList>

            {/* CHECK TAB */}
            <TabsContent value="check" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Your Email:</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  className="mt-1"
                />
              </div>

              <Button
                onClick={checkAndRepair}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Role Status'
                )}
              </Button>

              {result && (
                <div
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200 dark:bg-green-950'
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.success && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    )}
                    {!result.success && (
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{result.message}</p>
                      
                      {result.details && (
                        <div className="mt-2 text-xs space-y-1 font-mono">
                          <div>
                            <span className="text-muted-foreground">ID: </span>
                            <span>{result.details.userId}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Current Role: </span>
                            <Badge variant="outline" className="ml-1">
                              {result.details.currentRole || 'NONE'}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {result.details?.instruction === 'USE_SUPABASE_DASHBOARD' && (
                        <p className="mt-3 text-xs text-amber-700 dark:text-amber-200">
                          👉 Use the "Repair via Dashboard" tab for instructions
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* REPAIR TAB */}
            <TabsContent value="repair" className="space-y-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  📋 Steps to Restore Your Admin Role
                </h3>
                <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li>
                    <strong>Step 1:</strong> Open{' '}
                    <a
                      href="https://app.supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      app.supabase.com
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <strong>Step 2:</strong> Select your project from the sidebar
                  </li>
                  <li>
                    <strong>Step 3:</strong> Go to "SQL Editor" tab (left sidebar)
                  </li>
                  <li>
                    <strong>Step 4:</strong> Click "New query"
                  </li>
                  <li>
                    <strong>Step 5:</strong> Copy the SQL script below
                  </li>
                  <li>
                    <strong>Step 6:</strong> Paste it into the SQL editor
                  </li>
                  <li>
                    <strong>Step 7:</strong> Click "RUN"
                  </li>
                  <li>
                    <strong>Step 8:</strong> Wait for "Success" message
                  </li>
                  <li>
                    <strong>Step 9:</strong> Return here and refresh (F5)
                  </li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">SQL Script to Execute:</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copySqlToClipboard}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Script
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words text-muted-foreground">
                    {SQL_REPAIR_SCRIPT}
                  </pre>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✅ After running the SQL script and refreshing your browser, your admin_principal role will be restored!
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t">
            <p>
              <strong>What this page does:</strong> It checks if your admin_principal role is properly set
              in the database.
            </p>
            <p>
              <strong>If role is missing:</strong> Use the "Repair via Dashboard" tab to execute a SQL script
              that restores your role.
            </p>
            <p>
              <strong>After repairing:</strong> Refresh your browser (F5) to reload with your admin role active.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
