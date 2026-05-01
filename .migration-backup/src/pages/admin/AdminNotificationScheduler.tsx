import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Send, Clock } from 'lucide-react';
import { getNotificationScheduler } from '@/services/notification-scheduler';
import { dailyNotificationSchedule } from '@/services/notification-schedule-config';
import NotificationSystemHealth from '@/components/NotificationSystemHealth';

export default function NotificationSchedulerAdmin() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const scheduler = getNotificationScheduler(false);

  const refreshStats = () => {
    const newStats = scheduler.getStats();
    setStats(newStats);
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 30000); // Rafraîchir chaque 30s
    return () => clearInterval(interval);
  }, []);

  const handleTestNotification = async (type: 'love' | 'punch' | 'prayer' | 'promotion' | 'all') => {
    setIsLoading(true);
    setTestResult(null);
    try {
      await scheduler.sendNow(type);
      setTestResult(`✅ Notification ${type} envoyée avec succès!`);
    } catch (error) {
      setTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    setIsLoading(false);
  };

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduler de Notifications</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Statistiques du Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats.totalSent}</div>
              <div className="text-sm text-gray-600">Notifications envoyées aujourd'hui</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats.successRate}%</div>
              <div className="text-sm text-gray-600">Taux de succès</div>
            </div>
          </div>

          {/* Limites */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-amber-900">Limites quotidiennes</div>
                <div className="text-sm text-amber-800 mt-1">
                  • Maximum 7 notifications/jour<br />
                  • Maximum 3 par heure<br />
                  • Intervalle minimum: 5 minutes
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prochaines notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Calendrier d'aujourd'hui
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyNotificationSchedule.map((config, index) => {
              const now = new Date();
              const scheduleTime = config.hour * 60 + config.minute;
              const nowTime = now.getHours() * 60 + now.getMinutes();
              const isPast = scheduleTime <= nowTime;
              const isNext = !isPast && (!stats.nextScheduledNotifications[0] || 
                stats.nextScheduledNotifications[0].startsWith(`${config.hour}:`));

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isPast
                      ? 'bg-gray-50 border-gray-200'
                      : isNext
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : isNext ? (
                    <Clock className="w-5 h-5 text-green-600 flex-shrink-0 animate-pulse" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {String(config.hour).padStart(2, '0')}:{String(config.minute).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-600">{config.description}</div>
                  </div>
                  <Badge variant={isPast ? 'outline' : 'default'}>
                    {isPast ? 'Envoyée' : 'Planifiée'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tests manuels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Test des notifications
          </CardTitle>
          <CardDescription>Envoyer manuellement une notification pour tester</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleTestNotification('love')}
              disabled={isLoading}
              variant="outline"
              className="text-xs"
            >
              💖 Message d'amour
            </Button>
            <Button
              onClick={() => handleTestNotification('punch')}
              disabled={isLoading}
              variant="outline"
              className="text-xs"
            >
              💪 Punch
            </Button>
            <Button
              onClick={() => handleTestNotification('prayer')}
              disabled={isLoading}
              variant="outline"
              className="text-xs"
            >
              🙏 Prière
            </Button>
            <Button
              onClick={() => handleTestNotification('promotion')}
              disabled={isLoading}
              variant="outline"
              className="text-xs"
            >
              📱 Promotion
            </Button>
            <Button
              onClick={() => handleTestNotification('all')}
              disabled={isLoading}
              variant="default"
              className="col-span-2"
            >
              🚀 Test Complet (Toutes)
            </Button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult.startsWith('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <ul className="space-y-2 list-disc pl-4">
            <li>Le scheduler fonctionne en arrière-plan et envoie les notifications aux heures configurées</li>
            <li>Les notifications sont visibles en haut de l'écran et restent visibles jusqu'à action de l'utilisateur</li>
            <li>Web Push est activé et fonctionne même si l'app est fermée</li>
            <li>Les statistiques se mettent à jour chaque 30 secondes</li>
            <li>Mode test: cliquez sur les boutons pour envoyer immédiatement une notification</li>
          </ul>
        </CardContent>
      </Card>

      {/* Santé du système */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6" />
          Diagnostic du Système
        </h2>
        <NotificationSystemHealth />
      </div>
    </div>
  );
}
