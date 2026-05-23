# 📚 Checklist: Intégration des Fichiers Bibliques

## Étape 1: Préparation de la Structure de Dossiers

### Créer les répertoires:

```bash
mkdir -p src/data/bible-content/old-testament
mkdir -p src/data/bible-content/new-testament
mkdir -p src/data/bible-content/apocrypha
```

## Étape 2: Fichiers JSON à Préparer

### Testament Ancien (IDs 1-39)

Organisez vos fichiers JSON comme suit:

```
src/data/bible-content/old-testament/
├── 01-genesis.json           (Genèse)
├── 02-exodus.json            (Exode)
├── 03-leviticus.json         (Lévitique)
├── 04-numbers.json           (Nombres)
├── 05-deuteronomy.json       (Deutéronome)
├── 06-joshua.json            (Josué)
├── 07-judges.json            (Juges)
├── 08-ruth.json              (Ruth)
├── 09-1-samuel.json          (1 Samuel)
├── 10-2-samuel.json          (2 Samuel)
├── 11-1-kings.json           (1 Rois)
├── 12-2-kings.json           (2 Rois)
├── 13-1-chronicles.json      (1 Chroniques)
├── 14-2-chronicles.json      (2 Chroniques)
├── 15-ezra.json              (Esdras)
├── 16-nehemiah.json          (Néhémie)
├── 17-esther.json            (Esther)
├── 18-job.json               (Job)
├── 19-psalms.json            (Psaumes) ⚠️ IMPORTANT: 150 chapitres
├── 20-proverbs.json          (Proverbes)
├── 21-ecclesiastes.json      (Ecclésiaste)
├── 22-isaiah.json            (Ésaïe)
├── 23-jeremiah.json          (Jérémie)
├── 24-lamentations.json      (Lamentations)
├── 25-ezekiel.json           (Ézéchiel)
├── 26-daniel.json            (Daniel)
├── 27-hosea.json             (Osée)
├── 28-joel.json              (Joël)
├── 29-amos.json              (Amos)
├── 30-obadiah.json           (Abdias)
├── 31-jonah.json             (Jonas)
├── 32-micah.json             (Michée)
├── 33-nahum.json             (Nahum)
├── 34-habakkuk.json          (Habacuc)
├── 35-zephaniah.json         (Sophonie)
├── 36-haggai.json            (Aggée)
├── 37-zechariah.json         (Zacharie)
├── 38-malachi.json           (Malachie)
└── 39-baruch.json            (Baruch) ⚠️ Deutérocanonique
```

**Compter**: 39 fichiers

### Testament Nouveau (IDs 40-66)

```
src/data/bible-content/new-testament/
├── 40-matthew.json           (Matthieu)
├── 41-mark.json              (Marc)
├── 42-luke.json              (Luc)
├── 43-john.json              (Jean)
├── 44-acts.json              (Actes) ⚠️ 28 chapitres
├── 45-romans.json            (Romains)
├── 46-1-corinthians.json     (1 Corinthiens)
├── 47-2-corinthians.json     (2 Corinthiens)
├── 48-galatians.json         (Galates)
├── 49-ephesians.json         (Éphésiens)
├── 50-philippians.json       (Philippiens)
├── 51-colossians.json        (Colossiens)
├── 52-1-thessalonians.json   (1 Thessaloniciens)
├── 53-2-thessalonians.json   (2 Thessaloniciens)
├── 54-1-timothy.json         (1 Timothée)
├── 55-2-timothy.json         (2 Timothée)
├── 56-titus.json             (Tite)
├── 57-philemon.json          (Philémon)
├── 58-hebrews.json           (Hébreux)
├── 59-james.json             (Jacques)
├── 60-1-peter.json           (1 Pierre)
├── 61-2-peter.json           (2 Pierre)
├── 62-1-john.json            (1 Jean)
├── 63-2-john.json            (2 Jean)
├── 64-3-john.json            (3 Jean)
├── 65-jude.json              (Jude)
└── 66-revelation.json        (Apocalypse) ⚠️ 22 chapitres
```

**Compter**: 27 fichiers

### Livres Deutérocanoniques (IDs 47-54+, Optionnel)

```
src/data/bible-content/apocrypha/
├── (Optionnel si vous avez des livres supplémentaires)
```

## Étape 3: Format Correct des Fichiers JSON

### ✅ Format Recommandé (Imbriqué)

```json
{
  "id": 1,
  "name": "Genèse",
  "abbreviation": "Gn",
  "chapters": [
    {
      "number": 1,
      "verses": [
        {
          "number": 1,
          "text": "Au commencement, Dieu créa les cieux et la terre."
        },
        {
          "number": 2,
          "text": "La terre était informe et vide; les ténèbres couvraient la surface de l'abîme, et l'esprit de Dieu se mouvait au-dessus des eaux."
        },
        ...
      ]
    },
    {
      "number": 2,
      "verses": [
        ...
      ]
    }
  ]
}
```

### Format Accepté (Plat)

```json
{
  "id": 1,
  "name": "Genèse",
  "abbreviation": "Gn",
  "verses": [
    {
      "chapter": 1,
      "verse": 1,
      "text": "Au commencement, Dieu créa les cieux et la terre."
    },
    {
      "chapter": 1,
      "verse": 2,
      "text": "La terre était informe et vide..."
    }
  ]
}
```

**Recommandation**: Utilisez le **format imbriqué** pour meilleure structure et navigation.

## Étape 4: Validation des Fichiers

### Vérifier les Nombres de Chapitres

Assurez-vous que le nombre de chapitres dans chaque fichier correspond à `bible-books.json`:

```bash
# Vérifier la structure
jq '.chapters | length' src/data/bible-content/old-testament/01-genesis.json
# Doit retourner: 50
```

**Tableau des chapitres par livre**:

| Livre | Chapitres | ID |
|-------|-----------|-----|
| Genèse | 50 | 1 |
| Exode | 40 | 2 |
| Psaumes | **150** | 19 |
| Actes | **28** | 44 |
| Apocalypse | **22** | 66 |

⚠️ **Attention**: Vérifiez que vos fichiers ont exactement le nombre de chapitres listés dans `bible-books.json`.

## Étape 5: Tester le Chargement

### Test 1: Démarrer le serveur dev
```bash
npm run dev
```

### Test 2: Navigation de Test
1. Aller à `http://localhost:5173/biblical-reading`
2. Cliquer sur l'onglet **"73 Livres"**
3. Rechercher **"Genèse"**
4. Cliquer sur la carte **"Genèse Chapitres 1-50"**
5. Vérifier la navigation vers `/bible-book/1`
6. Cliquer sur le bouton **"1"** (chapitre 1)
7. Vérifier l'affichage des versets (ou message d'absence)

### Test 3: Vérifier les Erreurs Console
```
F12 → Console → Pas d'erreur rouge
```

## Étape 6: Dépannage

### Problème: "Chapitre non disponible"
**Cause**: Fichier JSON non trouvé ou format incorrect
**Solution**: 
1. Vérifier le nom de fichier (`01-genesis.json` et pas `Genesis.json`)
2. Vérifier le format JSON valide
3. Vérifier le dossier correct (`old-testament` vs `new-testament`)

### Problème: Versets vides
**Cause**: Structure JSON ne correspond pas à `BibleChapterViewer`
**Solution**: 
1. Vérifier le format imbriqué: `chapters[].verses[].text`
2. Valider JSON avec `jq` ou JSONLint

### Problème: Build échoue
**Cause**: Syntaxe JSON invalide
**Solution**:
```bash
# Valider tous les fichiers JSON
find src/data/bible-content -name "*.json" -exec jq . {} \;
```

## Étape 7: Optimisation (Optionnel)

### Réduire la Taille des Fichiers

Si les fichiers sont trop volumineux (>30 MB total):

#### Option A: Gzip les fichiers
```bash
gzip src/data/bible-content/old-testament/*.json
```

#### Option B: Utiliser le format plat
```json
{
  "id": 1,
  "name": "Genèse",
  "verses": [{"chapter": 1, "verse": 1, "text": "..."}]
}
```

#### Option C: Code-splitting par livre
Ajouter dans `vite.config.ts`:
```typescript
manualChunks: {
  'bible-old-testament': ['src/data/bible-content/old-testament/*'],
  'bible-new-testament': ['src/data/bible-content/new-testament/*'],
}
```

## 📋 Checklist Finale

- [ ] Dossiers créés: `old-testament/`, `new-testament/`, `apocrypha/`
- [ ] 39 fichiers Testament Ancien prêts
- [ ] 27 fichiers Testament Nouveau prêts
- [ ] Tous les fichiers JSON valides (jq check)
- [ ] Nombres de chapitres correspondent à `bible-books.json`
- [ ] Teste avec `npm run dev`
- [ ] Navigation fonctionne: Index → Lecture → 73 Livres → Recherche → Genèse → Chapitres
- [ ] Clique sur chapitre → Affiche versets (ou message d'absence)
- [ ] `npm run build` réussit (0 erreurs)

## 🚀 Commandes Utiles

```bash
# Valider la structure
find src/data/bible-content -type f -name "*.json" | wc -l
# Doit afficher: 66 (si 39 + 27 fichiers)

# Vérifier JSON valide
jq . src/data/bible-content/old-testament/01-genesis.json > /dev/null && echo "Valid JSON"

# Taille totale des fichiers
du -sh src/data/bible-content/

# Vérifier les chapitres d'un livre
jq '.chapters | length' src/data/bible-content/old-testament/19-psalms.json
# Doit retourner: 150
```

---

**Une fois cette checklist complétée, votre application aura une Bible complète et interactive! 📖✨**
