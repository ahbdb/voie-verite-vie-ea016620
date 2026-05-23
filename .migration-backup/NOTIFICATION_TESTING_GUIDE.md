# Guide de Test - Système de Notifications Amélioré

## ✅ Checklist de test

### Test 1: Vérifier que la notification s'affiche UNE FOIS PAR JOUR

1. **Ouvrir l'app le matin (avant 12h)**
   - ✅ Une notification VISIBLE apparaît: "🌅 Bienvenue! Bonjour!..."
   - ✅ La notification fait du BRUIT
   - ✅ La notification RESTE VISIBLE jusqu'au clic
   - ✅ Cliquez pour la fermer

2. **Recharger la page (même jour)**
   - ✅ AUCUNE nouvelle notification ne s'affiche
   - ✅ C'est normal - elle a déjà été envoyée aujourd'hui

3. **Attendre minuit, puis rouvrir l'app le lendemain**
   - ✅ Une NOUVELLE notification apparaît
   - ✅ C'est une nouvelle journée !

### Test 2: Vérifier l'adaptation selon l'heure

**Tester les 3 périodes:**

#### 🌅 Matin (avant 12h)
```
Emoji: 🌅
Message: "Bonjour! J'espère que ta nuit s'est bien passée..."
```

#### ☀️ Après-midi (12h-18h)
```
Emoji: ☀️
Message: "Bienvenue! J'espère que ta journée se passe bien!"
```

#### 🌙 Soir (après 18h)
```
Emoji: 🌙
Message: "Bonsoir! J'espère que ta journée s'est bien passée..."
```

**Comment tester?**
1. Ouvrir console: `F12` → `Console`
2. Voir l'heure: `new Date().getHours()`
3. Vérifier le message reçu correspond à l'heure

### Test 3: Vérifier que les notifications s'affichent même hors l'app

1. **Ouvrir l'app → notification s'affiche ✅**
2. **Fermer COMPLÈTEMENT l'app/onglet**
3. **Forcer une nouvelle notification (dév):**
   ```javascript
   // Dans la console
   localStorage.removeItem('welcome-notification-sent-{userId}-{date}');
   // Puis rouvrir l'app
   ```
4. **✅ La notification s'affiche même si l'app était fermée!**

### Test 4: Vérifier que les permissions ne bloquent pas

1. **Navigateur sans permission de notification:**
   - Devrait toujours demander silencieusement
   - L'app ne doit pas être bloquée
   - Si refusé → message de fallback

2. **Vérifier les permissions du navigateur:**
   - Chrome/Edge: Paramètres → Confidentialité → Notifications
   - Firefox: Préférences → Vie privée → Permissions
   - Voir si "Voie, Vérité, Vie" est listée

### Test 5: Sur téléphone (mobile)

#### Test sur Android
1. **Chrome Android:**
   - Notifications s'affichent en haut (barre de notification)
   - La notification fait du bruit (si son activé)
   - La notification reste visible jusqu'au clic
   
2. **Tester avec l'app en arrière-plan:**
   - Minimiser l'app
   - Recharger (ou attendre nouveau jour)
   - Notification devrait apparaître même arrière-plan

#### Test sur iOS
- Safari iOS ne supporte pas les notifications push sans serveur
- Mais affiche une toast in-app comme fallback
- À vérifier avec le système de toast actuel

### Test 6: Vérifier le localStorage

**Dans la console:**
```javascript
// Voir toutes les notifications sauvegardées
Object.keys(localStorage)
  .filter(k => k.includes('welcome'))
  .forEach(k => console.log(k, '→', localStorage.getItem(k)));

// Résultat attendu:
// welcome-notification-sent-user123-2025-02-16 → true
// welcome-notification-sent-user123-2025-02-17 → true
// (une par jour)
```

### Test 7: Vérifier que toutes notifications sont maintenant visibles

Les notifications suivantes doivent être **VISIBLES et AUDIBLES**:
- ✅ Notification de bienvenue (jour)
- ✅ Reminder de Carême (quand disponible)
- ✅ Reminder de Chemin de Croix (quand disponible)
- ✅ Notifications d'activités (quand disponible)

**Comment vérifier?**
1. Tester chaque feature
2. Vérifier que le son se lance
3. Vérifier que la notification s'affiche en haut

## 🐛 Débogage

### La notification ne s'affiche pas?

**Étape 1: Vérifier la permission**
```javascript
console.log(Notification.permission);
// Résultat: 'granted', 'denied', ou 'default'
```

**Étape 2: Vérifier le service worker**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service workers:', regs);
  console.log('Actif:', regs.length > 0);
});
```

**Étape 3: Vérifier la console du Service Worker**
- Chrome: DevTools → Application → Service Workers
- Firefox: about:debugging → This Firefox → Service Workers

**Étape 4: Vérifier localStorage**
```javascript
localStorage.getItem('welcome-notification-sent-...')
// Si 'true' → notification déjà envoyée aujourd'hui
// Si null → première fois
```

### Le son ne se lance pas?

**Android:**
- Vérifier que le téléphone n'est pas en silencieux
- Vérifier les permission app
- Vérifier les paramètres de notifications de Chrome

**iOS:**
- iOS 15+: Devrait fonctionner
- Vérifier les paramètres → Notifications → Safari

### Vibration ne fonctionne pas?

- Vérifier que le téléphone supporte les vibrations
- Attention: certains téléphones n'ont pas de moteur
- Vibration peut être désactivée dans les paramètres

## 📋 Checklist finale

- [ ] Notification apparaît avec le bon emoji (🌅/☀️/🌙)
- [ ] Message correct selon heure
- [ ] Une SEULE notification par jour
- [ ] Notification reste visible jusqu'au clic
- [ ] Son se lance (si son du téléphone activé)
- [ ] Notification visible hors l'app
- [ ] Aucune permission bloquante
- [ ] Fonctionne sur mobile
- [ ] localStorage bien rempli
- [ ] Service worker actif

## 💡 Tips supplémentaires

### Forcer une nouvelle notification pour DevOps

Si vous voullez tester rapidement sans attendre minuit:

```javascript
// Dans la console →
const userId = 'your-user-id'; // Voir dans Auth
const today = new Date().toISOString().split('T')[0];
localStorage.removeItem(`welcome-notification-sent-${userId}-${today}`);
location.reload(); // Recharger
// → Nouvelle notification!
```

### Voir les logs du service worker

```javascript
// Tous les logs du SW en Chrome DevTools
// F12 → Application → Service Workers → voir les logs
```

### Tester sans rechargement

```javascript
// Dans la console, appeler directement la fonction
import { sendDailyWelcomeNotification } from '@/lib/change-notification-system';

// Puis
const user = { id: 'test-user' }; // ou récupérer depuis auth
await sendDailyWelcomeNotification(user.id);
```

---

**Note:** Certains tests nécessitent un vrai téléphone ou un émulateur pour vérifier complètement les vibrations et sons.

