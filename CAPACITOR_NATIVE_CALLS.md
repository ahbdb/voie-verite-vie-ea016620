# 📱 Appels natifs style WhatsApp — Guide de finalisation

Capacitor est configuré, les permissions et le canal d'appel haute priorité sont prêts dans le code.
Voici ce qu'il reste à faire **sur ton ordinateur** (impossible depuis Lovable) pour avoir une vraie sonnerie type WhatsApp/Téléphone.

## 1. Setup initial (une seule fois)

```bash
# Après git clone
pnpm install
cd artifacts/3v-app
npx cap add android   # nécessite Android Studio
npx cap add ios       # nécessite un Mac + Xcode
pnpm build
npx cap sync
```

## 2. Android — Full-screen intent (sonne téléphone verrouillé)

Édite `artifacts/3v-app/android/app/src/main/AndroidManifest.xml` et ajoute dans `<manifest>` :

```xml
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
```

Place un fichier sonnerie dans `android/app/src/main/res/raw/beep.wav` (format wav/mp3, ~10–30s en boucle).

## 3. iOS — CallKit (vraie interface d'appel système)

CallKit nécessite du Swift dans Xcode. Étapes :

1. Ouvre `artifacts/3v-app/ios/App/App.xcworkspace` dans Xcode.
2. Active les capacités **Push Notifications** + **Background Modes → Voice over IP / Remote notifications**.
3. Ajoute le framework **CallKit** + **PushKit** dans "Frameworks, Libraries, and Embedded Content".
4. Dans `AppDelegate.swift`, enregistre PushKit pour recevoir les pushes VoIP et présenter l'appel via `CXProvider`.

Référence officielle Apple : https://developer.apple.com/documentation/callkit

## 4. Backend — Push haute priorité

Côté edge function `send-push-notification`, pour les payloads `action: "call"` :
- Android : déjà OK (Urgency: high)
- iOS : envoyer via APNs avec `apns-push-type: voip` et un certificat VoIP séparé (à configurer sur Firebase/APNs)

## 5. Tester

```bash
pnpm build && npx cap sync
npx cap run android   # ou ios
```

Lance un appel depuis l'interface admin → le téléphone doit sonner même verrouillé/en silencieux.