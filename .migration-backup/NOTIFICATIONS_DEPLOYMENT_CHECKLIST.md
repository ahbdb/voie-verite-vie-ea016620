# ✅ Checklist Mise en Production - Notifications

## 📋 Avant le Déploiement

### Code & TypeScript
- [ ] Zéro erreurs TypeScript: `npm run build` ✅
- [ ] Zéro warnings console en dev: `npm run dev` 
- [ ] Tous les fichiers créés testés localement

### Base de Données Supabase
- [ ] Migration SQL appliquée (si pas fait avant)
  - [ ] 3 tables créées: broadcast_notifications, user_notifications, notification_settings
  - [ ] RLS policies actives
  - [ ] Indexes en place
  - Vérifier: Supabase Dashboard → SQL → Voir les 3 tables

### Web Push
- [ ] HTTPS/certificat valide en production
- [ ] Service Worker enregistré: F12 → Application → Service Workers
- [ ] Status: "activated and running" ✅
- [ ] `public/notification-sw.js` accessible

### Permissions
- [ ] TestNotificationInitializer demande permissions au démarrage
- [ ] Users peuvent accorder/refuser dans popup
- [ ] Permissions persistent dans le navigateur

### Admin Interface
- [ ] Accès à `/admin` pour admins uniquement ✅
- [ ] Route `/admin/notification-scheduler` fonctionne
- [ ] Boutons test (💖 💪 🙏 📱) envoient notifs
- [ ] Dashboard affiche stats correctes
- [ ] Pas d'erreurs console lors des tests

### Documentation
- [ ] `COMPLETE_NOTIFICATIONS_SETUP.md` dans repo
- [ ] `NOTIFICATIONS_QUICK_REFERENCE.md` Dans repo
- [ ] `SESSION_NOTIFICATIONS_COMPLETION.md` dans repo
- [ ] Partagés avec l'équipe admin

---

## 🧪 Tester sur Vrais Appareils

### Android (Chrome / Firefox)
| Test | Résultat Attendu | Status |
|------|------------------|--------|
| Ouvrir app | Notif en haut d'écran si scheduled | [ ] A faire |
| Toucher notif | App se focus/ouvre | [ ] A faire |
| Fermer app | Notif reste visible | [ ] A faire |
| À l'heure prévue | Notif arrive auto (08:00, 11:00, etc) | [ ] A faire |
| Cliquer cloche | Voir liste notifs | [ ] A faire |
| Marquer lu | Badge met à jour | [ ] A faire |

### iPhone (Safari 16+)
| Test | Résultat |
|------|----------|
| Ouvrir app | Web Push prise en charge limitée |
| Notif en haut | Peut ne pas afficher sur certaines versions |
| Fermer app | Dépend du iOS/Safari version |

*Note: Web Push iOS est limité vs Android. In-app notifications (cloche) fonctionnent toujours.*

### Bureau (Chrome/Firefox)
| Test | Résultat Attendu | Status |
|------|------------------|--------|
| Notif en haut | Affichée en haut-droit du bureau | [ ] A faire |
| Fermeture auto | NON (requreInteraction: true) | [ ] A faire |
| Cliquer | Se focus sur l'onglet app | [ ] A faire |

---

## 📊 Vérifications Techniques

### Une semaine avant lancer:

- [ ] **Accès Supabase**:
  ```sql
  SELECT COUNT(*) FROM broadcast_notifications;
  SELECT COUNT(*) FROM user_notifications;
  -- Doivent tous deux exister et être vides (0 rows)
  ```

- [ ] **Service Worker**:
  ```javascript
  navigator.serviceWorker.getRegistrations().then(regs => {
    console.log(regs.length, 'SW registered');
    regs.forEach(r => console.log(r.scope, r.active ? 'ACTIVE' : 'WAITING'));
  });
  ```

- [ ] **Notification API**:
  ```javascript
  console.log('Permission:', Notification.permission);
  // Devrait être 'granted' après user agree
  ```

- [ ] **Scheduler Stats**:
  ```javascript
  getNotificationScheduler().getStats();
  // Devrait montrer nextScheduledNotifications (tableau des heures)
  ```

### Jour du lancer:

- [ ] **Diagnostic complet**:
  ```javascript
  runNotificationCheck()
  // Doit afficher majoritairement ✅
  // ⚠️ sur historique (normal J1) est OK
  ```

- [ ] **Test manuel chaque type**:
  - [ ] Admin: `/admin/notification-scheduler`
  - [ ] Click: 💖 → reçoit love message
  - [ ] Click: 💪 → reçoit punch message
  - [ ] Click: 🙏 → reçoit prayer
  - [ ] Click: 📱 → reçoit promotion
  - [ ] Click: 🚀 → reçoit toutes (5 à la fois)

- [ ] **Affichage cloche** (`/biblical-reading` ou autres pages):
  - [ ] Cloche visible en haut-droit
  - [ ] Badge affiche le nombre corrects
  - [ ] Cliquer popup montre les notifs
  - [ ] Marquer lu diminue le badge

---

## 🚨 Rollback Plan (Au Cas Où)

Si les notifications causent des problèmes:

### Option 1: Désactiver scheduler (pas les notifs manuelles)
```typescript
// Dans /src/App.tsx, commenter:
// initializeNotificationScheduler(false);
// Les admins peuvent toujours envoyer manuellement via `/admin/notifications`
```

### Option 2: Arrêter les notifs auto complètement
```typescript
// Même chose + arrêter NotificationInitializer
// Supprimer AdminNotificationScheduler route
```

### Option 3: Restore ancienne version (Git rollback)
```bash
git revert --no-edit <commit-hash>
git push origin main
```

---

## 📈 Monitoring Post-Lancer

### Première semaine
- [ ] Vérifier console navigateur (F12) - pas d'erreurs
- [ ] Supabase: `SELECT COUNT(*) FROM broadcast_notifications;` 
  - Devrait avoir ~35 notifs (5 par jour × 7 jours)
- [ ] Adresse: `/admin/notification-scheduler` - stats montrent croissance

### Après 1 mois
- [ ] totalSent stat dans dashboard monte continuellement
- [ ] successRate reste > 95%
- [ ] Pas de plaintes users about duplicate notifs
- [ ] localStorage history ne cause pas de perf issues

### Metriques à suivre
```javascript
// Dans Console, quotidiennement:
getNotificationScheduler().getStats()

// Résultat attendu:
{
  totalSent: 5,        // Exactement 5 per jour
  successRate: 100,    // Ou très proche
  nextScheduledNotifications: [...] // Devrait avoir items pour demain
}
```

---

## 🔒 Sécurité

### Vérifications finales

- [ ] Seuls les admins peuvent voir `/admin/notification-scheduler`
  - Tester avec compte user régulier: doit rediriger
  - Tester avec compte admin: doit voir dashboard
  
- [ ] RLS policies bloquent les users d'accès direct Supabase
  - User ne peut voir que ses propres notifs
  - User ne peut pas créer/modifier broadcast_notifications
  - Seul admin_role = true peut envoyer

- [ ] Service Worker ne révèle pas info sensibles
  - Pas d'API keys exposés
  - Pas de données user non-public

---

## 📞 Contacter Support Si:

- [ ] Scheduler ne tire pas après 15 min de lancer
- [ ] Service Worker ne s'enregistre pas
- [ ] Database error sur notification_settings table
- [ ] Users reportent notifs dupliquées
- [ ] Performance dégradée après plusieurs jours

---

## ✨ Success Criteria

✅ **Lancer réussi si**:
1. 5 notifs envoyées le premier jour (08:00, 11:00, 12:30, 15:00, 20:00)
2. Zéro erreurs TypeScript après build
3. Zéro erreurs console navigateur
4. Web Push affiche notif en haut d'écran
5. Admin dashboard accessible et stats correctes
6. `runNotificationCheck()` montre tout en vert (sauf historique J1)

✅ **Stable après 7 jours si**:
1. ~35 notifs dans database (5/jour × 7 jours)
2. successRate > 95%
3. Pas d'augmentation des errors logs
4. Users peuvent accorder/refuser permissions
5. Réception notifs consistent au même horaire chaque jour

---

## 🎉 After Launch

Une fois stable:

1. **Annoncer aux users**: "Vous recevrez des notifications inspirantes quotidiennes!"
2. **Feedback loop**: Écouter users si messages sont appréciés
3. **Ajustements**: Selon feedback, modifier messages ou horaires
4. **Scaling**: Après 1-2 mois, ajouter birthday notis ou autre enhances

---

**Good luck! 🚀 Vous avez un système solide et prêt pour millions de users!**
