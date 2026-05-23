/**
 * Script de vérification du système de notifications
 * Vérifie que tout est correctement configuré
 */

import { getNotificationScheduler } from '@/services/notification-scheduler';
import { dailyNotificationSchedule } from '@/services/notification-schedule-config';

interface CheckResult {
  name: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: string;
}

export class NotificationSystemChecker {
  private results: CheckResult[] = [];

  /**
   * Exécuter tous les contrôles
   */
  async runAllChecks(): Promise<CheckResult[]> {
    this.results = [];

    // Contrôles navigateur
    await this.checkBrowserSupport();
    this.checkNotificationPermission();
    await this.checkServiceWorker();
    
    // Contrôles scheduler
    this.checkSchedulerInitialized();
    this.checkScheduleConfiguration();
    
    // Contrôles localStorage
    this.checkLocalStorage();

    return this.results;
  }

  /**
   * Vérifier le support navigateur
   */
  private async checkBrowserSupport(): Promise<void> {
    if (!('Notification' in window)) {
      this.results.push({
        name: 'Support Notification API',
        status: 'ERROR',
        message: 'Ce navigateur ne supporte pas les notifications',
        details: 'Utilisez Chrome, Edge, Firefox ou Safari moderne'
      });
      return;
    }

    if (!('serviceWorker' in navigator)) {
      this.results.push({
        name: 'Support Service Worker',
        status: 'ERROR',
        message: 'Ce navigateur ne supporte pas les Service Workers',
      });
      return;
    }

    this.results.push({
      name: 'Support API',
      status: 'OK',
      message: 'Notification API ✅ et Service Worker ✅ supportés'
    });
  }

  /**
   * Vérifier permissions notifications
   */
  private checkNotificationPermission(): void {
    const permission = (Notification as any)?.permission || 'default';

    if (permission === 'granted') {
      this.results.push({
        name: 'Permission Notifications',
        status: 'OK',
        message: 'Permissions notifications: ACCORDÉES ✅'
      });
    } else if (permission === 'denied') {
      this.results.push({
        name: 'Permission Notifications',
        status: 'WARNING',
        message: 'Permissions notifications: REFUSÉES ⚠️',
        details: 'Activer dans paramètres navigateur pour que les notifications fonctionnent'
      });
    } else {
      this.results.push({
        name: 'Permission Notifications',
        status: 'WARNING',
        message: 'Permissions notifications: EN ATTENTE',
        details: 'Sera demandé au premier affichage'
      });
    }
  }

  /**
   * Vérifier Service Worker enregistré
   */
  private async checkServiceWorker(): Promise<void> {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length === 0) {
        this.results.push({
          name: 'Service Worker',
          status: 'WARNING',
          message: 'Aucun Service Worker enregistré',
          details: 'Sera enregistré automatiquement. Vérifiez que /notification-sw.js existe'
        });
        return;
      }

      const notificationSW = registrations.find(
        r => r.scope.includes('notification-sw')
      );

      if (notificationSW) {
        const state = notificationSW.active ? 'active' : notificationSW.installing ? 'installing' : 'waiting';
        this.results.push({
          name: 'Service Worker',
          status: state === 'active' ? 'OK' : 'WARNING',
          message: `Service Worker: ${state.toUpperCase()} ${state === 'active' ? '✅' : '⏳'}`,
          details: `Scope: ${notificationSW.scope}`
        });
      } else {
        this.results.push({
          name: 'Service Worker',
          status: 'WARNING',
          message: `${registrations.length} Service Worker(s) trouvé(s) mais aucun pour notifications`
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Service Worker',
        status: 'ERROR',
        message: 'Impossible de vérifier Service Worker',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  /**
   * Vérifier que le scheduler est initialisé
   */
  private checkSchedulerInitialized(): void {
    try {
      const scheduler = getNotificationScheduler();
      const stats = scheduler.getStats();

      this.results.push({
        name: 'Notification Scheduler',
        status: 'OK',
        message: `Scheduler initialisé ✅`,
        details: `Notifications envoyées aujourd'hui: ${stats.totalSent}\nTaux de succès: ${stats.successRate}%`
      });
    } catch (error) {
      this.results.push({
        name: 'Notification Scheduler',
        status: 'ERROR',
        message: 'Impossible d\'initialiser le scheduler',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  /**
   * Vérifier la configuration du scheduler
   */
  private checkScheduleConfiguration(): void {
    if (!dailyNotificationSchedule || dailyNotificationSchedule.length === 0) {
      this.results.push({
        name: 'Configuration Scheduler',
        status: 'ERROR',
        message: 'Aucune notification programmée',
      });
      return;
    }

    const schedule = dailyNotificationSchedule
      .map(config => `${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')}`)
      .join(', ');

    this.results.push({
      name: 'Configuration Scheduler',
      status: 'OK',
      message: `${dailyNotificationSchedule.length} notifications programmées ✅`,
      details: `Heures: ${schedule}`
    });
  }

  /**
   * Vérifier localStorage
   */
  private checkLocalStorage(): void {
    try {
      const test = '__notification_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      
      this.results.push({
        name: 'LocalStorage',
        status: 'OK',
        message: 'LocalStorage accessible ✅'
      });

      // Vérifier l'historique
      const history = localStorage.getItem('notification_scheduler_history');
      if (history) {
        try {
          const parsed = JSON.parse(history);
          this.results.push({
            name: 'Historique Notifications',
            status: 'OK',
            message: `${parsed.length} notifications dans l'historique`,
          });
        } catch {
          this.results.push({
            name: 'Historique Notifications',
            status: 'WARNING',
            message: 'Historique corrompu',
          });
        }
      } else {
        this.results.push({
          name: 'Historique Notifications',
          status: 'WARNING',
          message: 'Aucun historique (normal si première utilisation)',
        });
      }
    } catch (error) {
      this.results.push({
        name: 'LocalStorage',
        status: 'ERROR',
        message: 'LocalStorage non accessible',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  /**
   * Afficher les résultats dans la console
   */
  printResults(): void {
    console.clear();
    console.log('%c╔════════════════════════════════════════╗', 'color: #4CAF50; font-weight: bold');
    console.log('%c║  Vérification Système Notifications    ║', 'color: #4CAF50; font-weight: bold');
    console.log('%c╚════════════════════════════════════════╝', 'color: #4CAF50; font-weight: bold');

    for (const result of this.results) {
      const symbol = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      const color = result.status === 'OK' ? '#4CAF50' : result.status === 'WARNING' ? '#FF9800' : '#f44336';
      
      console.log(`\n%c${symbol} ${result.name}`, `color: ${color}; font-weight: bold`);
      console.log(`   ${result.message}`);
      if (result.details) {
        console.log(`   📝 ${result.details}`);
      }
    }

    // Résumé
    const errorCount = this.results.filter(r => r.status === 'ERROR').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const okCount = this.results.filter(r => r.status === 'OK').length;

    console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50');
    console.log(`%c✅ OK: ${okCount}  ⚠️ Avertissements: ${warningCount}  ❌ Erreurs: ${errorCount}`, 'color: #333; font-weight: bold');
    
    if (errorCount === 0 && warningCount === 0) {
      console.log('%c🎉 Tout est prêt! Les notifications fonctionneront correctement.', 'color: #4CAF50; font-weight: bold');
    } else if (errorCount === 0) {
      console.log('%c⚠️ Quelques avertissements, mais le système devrait fonctionner.', 'color: #FF9800; font-weight: bold');
    } else {
      console.log('%c❌ Problèmes détectés. Voir détails ci-dessus.', 'color: #f44336; font-weight: bold');
    }

    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50');
  }

  /**
   * Obtenir résumé JSON
   */
  getSummary() {
    return {
      timestamp: new Date().toISOString(),
      totalChecks: this.results.length,
      passed: this.results.filter(r => r.status === 'OK').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length,
      errors: this.results.filter(r => r.status === 'ERROR').length,
      results: this.results
    };
  }
}

/**
 * Fonction de test rapide
 */
export async function runNotificationCheck() {
  const checker = new NotificationSystemChecker();
  await checker.runAllChecks();
  checker.printResults();
  return checker.getSummary();
}

// Export pour utilisation dans DevTools
if (typeof window !== 'undefined') {
  (window as any).runNotificationCheck = runNotificationCheck;
}
