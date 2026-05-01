# ⚡ APPLIQUER LA MIGRATION - C'EST FAIT!

## 🎯 5 Étapes (2 minutes)

### 1. Ouvrez Supabase
https://supabase.com/dashboard

### 2. Sélectionnez le projet
`voie-verite-vie` (kaddsojhnkyfavaulrfc)

### 3. SQL Editor
Menu gauche → **SQL Editor** → **New Query**

### 4. COPIER LE SQL COMPLET
**Fichier**: `APPLY_NOTIFICATION_MIGRATION.sql`

Sélectionnez tout (Ctrl+A) → Collez dans l'éditeur

### 5. EXÉCUTER
Cliquez **RUN** (ou Ctrl+Enter)

```
✅ La migration s'applique instantanément!
```

## ✅ C'est Fait!

Les tables sont créées:
- `broadcast_notifications`
- `user_notifications` 
- `notification_settings`

## 🚀 TESTER

Allez à: `http://localhost:5173/admin/notifications`

Envoyez une notification → Vérifiez la cloche 🔔

---

**Ça c'est tout! Les notifications persistantes sont maintenant activées!** 🎉
