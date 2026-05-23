# Configuration du Workflow de Synchronisation

Ce workflow synchronise automatiquement les changements entre les deux repositories:
- **lannedjo/voie-verite-vie** (repository principal)
- **ahbdb/voie-verite-vie** (repository collaboratif)

## Configuration requise

### 1. Créer un Personal Access Token (PAT) pour ahbdb

**Sur le compte GitHub ahbdb:**

1. Allez à `Settings` → `Developer settings` → `Personal access tokens` → `Tokens (classic)`
2. Cliquez sur `Generate new token (classic)`
3. Donnez-lui un nom: `SYNC_TOKEN_VOIE_VERITE_VIE`
4. Sélectionnez les scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Générez le token et **copiez-le** (vous ne pourrez pas le revoir)

### 2. Ajouter le secret au repository lannedjo

**Sur le repository lannedjo/voie-verite-vie:**

1. Allez à `Settings` → `Secrets and variables` → `Actions`
2. Cliquez sur `New repository secret`
3. Nom: `AHBDB_PAT`
4. Valeur: Le token que vous avez copié d'ahbdb
5. Cliquez sur `Add secret`

### 3. Donner à ahbdb l'accès au repository lannedjo (optionnel mais recommandé)

**Sur le repository lannedjo/voie-verite-vie:**

1. Allez à `Settings` → `Collaborators`
2. Cliquez sur `Add people`
3. Recherchez l'utilisateur GitHub `ahbdb`
4. Sélectionnez le rôle `Maintain` ou `Admin`
5. Cliquez sur `Add`

## Comment ça marche

```
┌─────────────────────────────────────────────────────────────┐
│ ahbdb pousse vers ahbdb/voie-verite-vie                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Workflow GitHub Actions se déclenche automatiquement         │
│ - Clonne lannedjo/voie-verite-vie                            │
│ - Ajoute ahbdb/voie-verite-vie comme remote                  │
│ - Pousse tous les changements vers ahbdb                     │
│ - Tire les changements d'ahbdb vers lannedjo                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Les deux repositories restent synchronisés! 🎉              │
│ - lannedjo/voie-verite-vie = source de vérité               │
│ - ahbdb/voie-verite-vie = mirror synchronisé                │
└─────────────────────────────────────────────────────────────┘
```

## Flux de travail recommandé

### Pour lannedjo:
```bash
# Travaillez normalement
git add .
git commit -m "feat: description"
git push origin main
# Le workflow synchronisera automatiquement vers ahbdb
```

### Pour ahbdb:
```bash
# Option 1: Contribuer via fork + PR
# 1. Fork le repository lannedjo
# 2. Travaillez sur votre fork
# 3. Créez une PR vers lannedjo/main
# 4. Le workflow synchronisera quand la PR est mergée

# Option 2: Accès direct (si collaborateur)
git clone https://github.com/lannedjo/voie-verite-vie.git
git checkout -b feature/mon-feature
# Travaillez et committez
git push origin feature/mon-feature
# Créez une PR vers main
```

## Dépannage

### Le workflow ne synchronise pas
1. Vérifiez que le secret `AHBDB_PAT` est configuré correctement
2. Vérifiez que le token n'a pas expiré
3. Vérifiez les logs du workflow: `Actions` → Sélectionnez le workflow → Cliquez sur la dernière exécution

### Conflit lors de la synchronisation
- Le workflow utilise `continue-on-error: true` pour continuer même en cas d'erreur
- Les conflits sont résolvus avec `git merge ... -X ours` (garder la version de lannedjo)
- Vous pouvez fusionner manuellement si nécessaire

### Le token a expiré
1. Créez un nouveau token sur le compte ahbdb
2. Mettez à jour le secret `AHBDB_PAT` dans lannedjo
3. Relancez le workflow manuellement

## Lancer le workflow manuellement

Si vous voulez synchroniser manuellement sans attendre un push:

1. Allez à `Actions` → `Sync to ahbdb Repository`
2. Cliquez sur `Run workflow`
3. Sélectionnez la branche `main`
4. Cliquez sur `Run workflow`

## Sécurité

- ⚠️ Le token `AHBDB_PAT` est **secret** et crypté par GitHub
- ⚠️ Il n'apparaît jamais dans les logs du workflow
- ⚠️ N'activez ce workflow que si ahbdb est un collaborateur de confiance
- ✅ Utilisez les scopes minimaux nécessaires pour le token

## Alternative: Synchronisation bidirectionnelle

Si vous voulez que **les deux repositories soient des sources de vérité**:

1. Créez aussi un token pour lannedjo
2. Créez un workflow sur ahbdb/voie-verite-vie qui synchronise vers lannedjo
3. Gérez les conflits avec une branche `develop` pour les merges

## Contact

Pour des questions sur la synchronisation:
- Vérifiez les logs du workflow dans GitHub Actions
- Consultez la [documentation GitHub Actions](https://docs.github.com/en/actions)
