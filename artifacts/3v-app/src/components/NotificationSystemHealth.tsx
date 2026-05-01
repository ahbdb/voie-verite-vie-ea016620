import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { NotificationSystemChecker } from '@/services/notification-system-checker';

interface CheckResult {
  name: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: string;
}

export default function NotificationSystemHealth() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const runCheck = async () => {
    setIsChecking(true);
    try {
      const checker = new NotificationSystemChecker();
      const allResults = await checker.runAllChecks();
      setResults(allResults);
      setLastCheck(new Date().toLocaleTimeString());
      checker.printResults(); // Aussi afficher dans console
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    runCheck();
  }, []);

  const errorCount = results.filter(r => r.status === 'ERROR').length;
  const warningCount = results.filter(r => r.status === 'WARNING').length;
  const okCount = results.filter(r => r.status === 'OK').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'text-green-600 bg-green-50';
      case 'WARNING':
        return 'text-amber-600 bg-amber-50';
      case 'ERROR':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5" />;
      case 'ERROR':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Santé du Système de Notifications</CardTitle>
              <CardDescription>
                {lastCheck ? `Dernière vérification: ${lastCheck}` : 'Vérification en cours...'}
              </CardDescription>
            </div>
            <Button
              onClick={runCheck}
              disabled={isChecking}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Vérification...' : 'Vérifier'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600">{okCount}</div>
              <div className="text-sm text-green-800">Vérifications OK</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="text-3xl font-bold text-amber-600">{warningCount}</div>
              <div className="text-sm text-amber-800">Avertissements</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-3xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-red-800">Erreurs</div>
            </div>
          </div>

          {/* Message de statut global */}
          <div className="mt-4 p-4 rounded-lg border">
            {errorCount === 0 && warningCount === 0 ? (
              <div className="text-green-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                🎉 Excellent! Toutes les vérifications sont passées. Le système de notifications fonctionne normalement.
              </div>
            ) : errorCount === 0 ? (
              <div className="text-amber-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                ⚠️ Il y a quelques avertissements, mais le système devrait fonctionner.
              </div>
            ) : (
              <div className="text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ❌ Des problèmes ont été détectés. Voir les détails ci-dessous.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résultats détaillés */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Résultats détaillés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Exécutez une vérification pour voir les résultats...
            </div>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border flex gap-3 ${getStatusColor(result.status)}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{result.name}</div>
                  <div className="text-sm opacity-90">{result.message}</div>
                  {result.details && (
                    <div className="text-xs opacity-75 mt-1 whitespace-pre-wrap">
                      {result.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions recommandées */}
      {(errorCount > 0 || warningCount > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Actions recommandées
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {results
              .filter(r => r.status !== 'OK')
              .map((result, index) => (
                <div key={index} className="flex gap-2">
                  <span className="font-semibold flex-shrink-0">{index + 1}.</span>
                  <span>{result.message}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
