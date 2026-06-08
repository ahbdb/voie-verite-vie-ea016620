# QA — Canal Android `incoming_calls` (écran verrouillé + mode silencieux)

Ce document est la procédure officielle pour valider, sur un appareil physique, que les notifications d'appel (`action: "call"`) sonnent **même téléphone verrouillé et en mode silencieux/DND**.

> Le test automatisé (`supabase/functions/send-push-notification/index_test.ts`) garantit déjà le **contrat de payload** côté serveur (urgency high, requireInteraction, vibration agressive, action="call"). Cette checklist couvre ce qui ne peut être validé qu'en conditions réelles.

---

## 0. Prérequis

- [ ] App compilée via Capacitor (`pnpm build && npx cap sync && npx cap run android`)
- [ ] Installée sur un téléphone Android **physique** avec Google Play Services
- [ ] Compte utilisateur connecté sur le téléphone, autorisation notifications accordée
- [ ] Permissions Android dans `AndroidManifest.xml` :
  - `POST_NOTIFICATIONS`
  - `USE_FULL_SCREEN_INTENT`
  - `VIBRATE`
  - `WAKE_LOCK`
- [ ] Canal `incoming_calls` créé (`ensureCallChannel()` dans `src/lib/native-push.ts`, `importance: 5`, `visibility: 1`, son `beep.wav`)
- [ ] Fichier `android/app/src/main/res/raw/beep.wav` présent
- [ ] Token FCM bien enregistré dans `fcm_tokens` (vérifier dans la table)

## 1. Scénario A — Écran verrouillé, sonnerie normale

1. Verrouiller le téléphone (bouton power).
2. Depuis un autre compte admin sur le web, lancer un appel (`AdminVideo` → "Lancer appel").
3. **Attendu** : dans les 5 s, l'écran s'allume, la notification plein écran apparaît, sonnerie + vibration.
- [ ] OK

## 2. Scénario B — Écran verrouillé + mode silencieux (sonnerie coupée, vibreur ON)

1. Régler le volume sonnerie à 0 (vibreur uniquement).
2. Verrouiller le téléphone.
3. Lancer un appel depuis l'admin web.
4. **Attendu** : notification plein écran + vibration agressive (pattern 400/200/400/200/600).
- [ ] OK

## 3. Scénario C — Mode "Ne pas déranger" (DND) total

1. Activer DND total.
2. Aller dans Paramètres Android → Notifications → 3V → Canal "Appels entrants" → **Autoriser à passer outre Ne pas déranger** = ON.
3. Verrouiller, lancer un appel.
4. **Attendu** : la notif passe outre DND (son + vibration).
- [ ] OK

## 4. Scénario D — App tuée (swipe close)

1. Fermer complètement l'app (swipe depuis les apps récentes).
2. Verrouiller, lancer un appel.
3. **Attendu** : FCM réveille l'app, notif plein écran apparaît.
- [ ] OK

## 5. Scénario E — Doze mode (>30 min inactif)

1. Laisser le téléphone inactif >30 min OU forcer Doze :
   ```
   adb shell dumpsys deviceidle force-idle
   ```
2. Lancer un appel.
3. **Attendu** : `Urgency: high` côté serveur force la livraison immédiate.
- [ ] OK

## 6. Vérifications post-test

- [ ] Tap sur la notif → ouvre `/video` (ou l'URL du payload)
- [ ] La notification reste affichée tant qu'elle n'est pas tappée (`requireInteraction: true`, `ongoing: true`)
- [ ] Logs serveur (`supabase functions logs send-push-notification`) : `sent: ≥1, failed: 0`
- [ ] Aucun token expiré (cleanup `404/410` à 0 sur appareil actif)

## 7. Si un scénario échoue

| Symptôme | Cause probable | Fix |
|---|---|---|
| Pas de son écran verrouillé | Canal créé avec mauvaise `importance` | Désinstaller/réinstaller l'app (un canal ne peut pas être upgradé après création) |
| Pas de notif en DND | Override DND non accordé | Activer manuellement dans réglages canal |
| Notif arrive en retard | `Urgency: normal` envoyé | Vérifier que payload contient bien `action: "call"` |
| App tuée → rien | `verify_jwt`/token absent | Vérifier `fcm_tokens` |
| iOS ne sonne pas verrouillé | CallKit/PushKit non configuré | Voir `CAPACITOR_NATIVE_CALLS.md` |

---

**Test automatisé associé** : `supabase/functions/send-push-notification/index_test.ts` — exécuter via `supabase functions test` ou depuis Lovable.