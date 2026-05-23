/**
 * ✨ Diagnostic de Fuites Mémoire pour PWA
 * Détecte les subscriptions zombies, listeners non nettoyés, etc.
 */

export class MemoryLeakDiagnostics {
  private subscriptionCountSnapshot = 0;
  private timerCountSnapshot = 0;

  /**
   * Diagnostiquer les problèmes de mémoire
   */
  async diagnose() {
    console.clear();
    console.log('%c🔍 DIAGNOSTIC FUITES MÉMOIRE - PWA', 'color: #ff6b6b; font-size: 16px; font-weight: bold');
    console.log('%c' + '='.repeat(50), 'color: #ff6b6b');

    this.checkSupabaseConnections();
    this.checkEventListeners();
    this.checkTimers();
    this.checkMemory();
    this.checkServiceWorkers();
    this.checkLocalStorage();
    this.checkSubscriptions();

    console.log('%c' + '='.repeat(50), 'color: #ff6b6b');
    console.log('%c✨ Diagnostic complet terminé', 'color: #4CAF50; font-weight: bold');
  }

  /**
   * Vérifier les connexions Supabase
   */
  private checkSupabaseConnections() {
    console.log('%c📡 Connexions Supabase', 'color: #2196F3; font-weight: bold');
    
    // Gets all channels from Supabase
    const channels = (window as any).__SUPABASE_DEBUG_CHANNELS__ || [];
    console.log(`  ├─ Channels actifs: ${channels.length}`);
    
    if (channels.length > 5) {
      console.warn(
        '%c  ⚠️ TROP DE CHANNELS! Risque de fuite mémoire.',
        'color: #FF9800'
      );
      console.log('%c  → Channels:', 'color: #999');
      channels.slice(0, 5).forEach((ch: any) => {
        console.log(`     - ${ch.toString && ch.toString()}`);
      });
    }
  }

  /**
   * Vérifier les event listeners
   */
  private checkEventListeners() {
    console.log('%c🎯 Event Listeners', 'color: #2196F3; font-weight: bold');
    
    try {
      // This is a rough estimate since we can't directly access all listeners
      const doc = document as any;
      const listeners = doc._getEventListeners?.('scroll') || [];
      
      console.log(`  ├─ listeners (estimé): ${listeners.length}`);
      
      if (listeners.length > 10) {
        console.warn(
          '%c  ⚠️ Beaucoup de listeners! Vérifier les cleanup',
          'color: #FF9800'
        );
      }
    } catch (e) {
      // Fallback si API non dispo
      console.log('  ├─ Listeners: (non accessible)');
    }
  }

  /**
   * Vérifier les timers (setInterval, setTimeout)
   */
  private checkTimers() {
    console.log('%c⏱️ Timers (setInterval/setTimeout)', 'color: #2196F3; font-weight: bold');
    
    // Max possible timer ID in the browser is usually ~2B
    // Si proche de max, c'est un problème
    const estimatedTimerCount = (window as any).__TIMER_COUNT__ || '?';
    console.log(`  ├─ Timers actifs (estimé): ${estimatedTimerCount}`);
    console.log('  └─ Vérifier console si beaucoup de "setInterval"');
  }

  /**
   * Vérifier la mémoire JS
   */
  private checkMemory() {
    console.log('%c💾 Mémoire JavaScript', 'color: #2196F3; font-weight: bold');
    
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      const used = Math.round(mem.usedJSHeapSize / 1048576); // MB
      const limit = Math.round(mem.jsHeapSizeLimit / 1048576); // MB
      const percent = Math.round((used / limit) * 100);

      console.log(`  ├─ Heap utilisé: ${used} / ${limit} MB`);
      console.log(`  ├─ Pourcentage: ${percent}%`);
      
      if (percent > 90) {
        console.error(
          '%c  ❌ ALERTE MÉMOIRE! Bientôt crash!',
          'color: #f44336; font-weight: bold'
        );
      } else if (percent > 75) {
        console.warn(
          '%c  ⚠️ Mémoire élevée - vérifier pour fuites',
          'color: #FF9800'
        );
      } else {
        console.log('%c  ✅ Mémoire OK', 'color: #4CAF50');
      }
    } else {
      console.log('  ├─ Performance.memory: non disponible (Chrome/Edge only)');
    }
  }

  /**
   * Vérifier les Service Workers
   */
  private async checkServiceWorkers() {
    console.log('%c🔧 Service Workers', 'color: #2196F3; font-weight: bold');
    
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`  ├─ Registrations: ${registrations.length}`);
      
      registrations.forEach((reg, idx) => {
        const status = reg.active 
          ? '✅ active' 
          : reg.installing 
          ? '⏳ installing' 
          : '⏳ waiting';
        console.log(`  │  ${idx + 1}. ${status} - ${reg.scope}`);
      });

      if (registrations.length > 3) {
        console.warn(
          '%c  ⚠️ Trop de SW registrations - peut causer problèmes',
          'color: #FF9800'
        );
      }
    } catch (e) {
      console.error('  ❌ Erreur:', e);
    }
  }

  /**
   * Vérifier le localStorage
   */
  private checkLocalStorage() {
    console.log('%c💾 LocalStorage', 'color: #2196F3; font-weight: bold');
    
    try {
      let totalSize = 0;
      let itemCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
          itemCount++;
        }
      }

      const sizeKB = (totalSize / 1024).toFixed(2);
      console.log(`  ├─ Items: ${itemCount}`);
      console.log(`  ├─ Taille: ~${sizeKB} KB`);
      
      if (totalSize > 5 * 1024 * 1024) {
        console.warn(
          '%c  ⚠️ LocalStorage gros! Peut ralentir',
          'color: #FF9800'
        );
      } else {
        console.log('%c  ✅ OK', 'color: #4CAF50');
      }

      // Check for corrupted keys
      const suspiciousKeys = Array.from({length: localStorage.length}).map((_, i) => {
        const key = localStorage.key(i);
        return key;
      });
      
      console.log('  └─ Clés principales:', suspiciousKeys.slice(0, 5));
    } catch (e) {
      console.error('  ❌ Erreur:', e);
    }
  }

  /**
   * Vérifier les subscriptions Supabase zombies
   */
  private checkSubscriptions() {
    console.log('%c📡 Subscriptions Supabase', 'color: #2196F3; font-weight: bold');
    
    try {
      // Check Careme2026 subscriptions
      const subscriptionInfo = {
        'Careme2026': (window as any).__CAREME_SUB_COUNT__ || '?',
        'CheminDeCroix': (window as any).__CHEMIN_SUB_COUNT__ || '?',
      };
      
      for (const [name, count] of Object.entries(subscriptionInfo)) {
        console.log(`  ├─ ${name}: ${count} subscriptions`);
      }
      
      console.log('  └─ Note: Les subscriptions doivent être stables (pas de Date.now())');
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Recommandations basées sur le diagnostic
   */
  suggestFixes() {
    console.log('%c💡 Recommandations', 'color: #4CAF50; font-weight: bold');
    const issues = [];

    if ((performance as any).memory?.usedJSHeapSize > (performance as any).memory?.jsHeapSizeLimit * 0.9) {
      issues.push('❌ Mémoire critique - redémarrez l\'app');
    }

    console.log(issues.length === 0 ? '✅ Aucun problème grave détecté' : issues.join('\n'));
  }
}

/**
 * Lance le diagnostic
 * Utilisez dans DevTools Console:
 *   runMemoryDiagnostics()
 */
export async function runMemoryDiagnostics() {
  const diag = new MemoryLeakDiagnostics();
  await diag.diagnose();
  diag.suggestFixes();
}

// Rendre disponible globalement
if (typeof window !== 'undefined') {
  (window as any).runMemoryDiagnostics = runMemoryDiagnostics;
  (window as any).MemoryLeakDiagnostics = MemoryLeakDiagnostics;
}
