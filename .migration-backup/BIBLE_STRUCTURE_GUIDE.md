# Guide de Structure pour les Fichiers Bibliques

## 📁 Structure de Dossiers Recommandée

Pour intégrer les fichiers complets de la Bible avec contenu par chapitre et verset, voici la structure recommandée:

```
src/
├── data/
│   ├── bible-books.json                 # ✅ EXISTANT - Métadonnées des 73 livres
│   └── bible-content/                   # 📁 À CRÉER - Contenu biblique complet
│       ├── old-testament/                # Testament Ancien
│       │   ├── 01-genesis.json           # "01-genesis.json" pour Genèse
│       │   ├── 02-exodus.json
│       │   ├── ...
│       │   └── 39-malachi.json
│       ├── new-testament/                # Testament Nouveau
│       │   ├── 40-matthew.json           # Commence à 40 (après livres AT)
│       │   ├── 41-mark.json
│       │   ├── ...
│       │   └── 66-revelation.json
│       └── apocrypha/                    # Livres Deutérocanoniques (optionnel)
│           ├── 47-tobit.json
│           ├── 48-judith.json
│           └── ...
```

## 📋 Format Recommandé pour les Fichiers JSON

### Structure par Livre:

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
          "text": "La terre était informe et vide..."
        }
      ]
    },
    {
      "number": 2,
      "verses": [
        {
          "number": 1,
          "text": "Ainsi furent achevés les cieux et la terre..."
        }
      ]
    }
  ]
}
```

### OU Structure Plate (plus légère):

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

## 🚀 Implémentation

### Étape 1: Créer la Structure de Dossiers

```bash
mkdir -p src/data/bible-content/{old-testament,new-testament,apocrypha}
```

### Étape 2: Placer les Fichiers JSON

Placez vos fichiers JSON dans les dossiers correspondants:
- Livres de Genèse à Malachie (1-39) → `src/data/bible-content/old-testament/`
- Livres de Matthieu à Apocalypse (40-66) → `src/data/bible-content/new-testament/`
- Livres Deutérocanoniques (47-54, si inclus) → `src/data/bible-content/apocrypha/`

### Étape 3: Créer un Loader de Contenu Biblique

Créez un utilitaire pour charger dynamiquement les fichiers:

```typescript
// src/lib/bible-loader.ts
export const loadBibleBook = async (bookId: number, bookName: string) => {
  try {
    const book = await import(`@/data/bible-content/old-testament/${bookId.toString().padStart(2, '0')}-${bookName.toLowerCase()}.json`);
    return book.default;
  } catch {
    // Fallback: essayer new-testament ou apocrypha
    return null;
  }
};
```

### Étape 4: Mettre à Jour BibleBookDetail.tsx

Ajouter l'affichage des versets après clic sur un chapitre:

```typescript
// Dans BibleBookDetail.tsx
const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
const [verses, setVerses] = useState<Verse[]>([]);

const handleChapterClick = async (chapterNumber: number) => {
  setSelectedChapter(chapterNumber);
  const bookContent = await loadBibleBook(bookId, book?.name || '');
  const chapterVerses = bookContent?.chapters[chapterNumber - 1]?.verses || [];
  setVerses(chapterVerses);
};
```

## 📊 Alternative: Utiliser une API Distante

Si vos fichiers sont trop volumineux, envisagez:

1. **API Bible Distante** (ex: api.scripture.api.Bible):
   - Avantages: Fichiers allégés, contenu toujours à jour
   - Inconvénients: Dépend de la connexion Internet

2. **CDN Statique** (ex: jsDelivr, Cloudflare):
   - Placez les fichiers sur un CDN public
   - Chargez-les via fetch() au runtime

3. **Base de Données Supabase**:
   - Stockez le contenu biblique dans une table Supabase
   - Créez une fonction Edge pour le servir

## 💾 Gestion du Stockage

| Méthode | Taille | Vitesse | Flexibilité | Recommandation |
|---------|--------|---------|-------------|---|
| **JSON local** | 20-30 MB | ⚡ Très rapide | ⭐⭐⭐ | ✅ Pour <10 livres |
| **Importé dynamiquement** | 5-10 MB | ⚡ Rapide | ⭐⭐⭐⭐ | ✅ Pour structure complète |
| **Supabase** | Variable | 🔄 Moyen | ⭐⭐⭐⭐⭐ | ✅ Pour contenu maître |
| **API distante** | Minimal | 🌐 Variable | ⭐⭐⭐⭐⭐ | ⚠️ Dépendance externe |

**Recommandation pour Votre Projet**: 
- ✅ Utilisez **JSON importé dynamiquement** dans `src/data/bible-content/`
- Les fichiers seront bundlés dans le build Vite
- Chargement rapide, zéro dépendance externe
- Parfait pour une PWA offline-ready

## 🔗 Relation avec bible-books.json

Le fichier `bible-books.json` (métadonnées):
```json
{
  "id": 1,
  "name": "Genèse",
  "abbreviation": "Gn",
  "chapters": 50,      // ← Nombre de chapitres
  "order": 1,
  "testament": "old",
  "apocrypha": false
}
```

Le fichier dans `bible-content/old-testament/01-genesis.json` (contenu):
```json
{
  "id": 1,
  "name": "Genèse",
  "chapters": [
    { "number": 1, "verses": [...] },
    { "number": 2, "verses": [...] },
    ...
    { "number": 50, "verses": [...] }
  ]
}
```

## ✅ Checklist d'Implémentation

- [ ] Créer les dossiers `src/data/bible-content/{old,new}-testament/`
- [ ] Placer les fichiers JSON par livre
- [ ] Créer `src/lib/bible-loader.ts` pour charger dynamiquement
- [ ] Mettre à jour `BibleBookDetail.tsx` pour afficher versets
- [ ] Ajouter gestion d'erreur si chapitre/verset manquant
- [ ] Tester le chargement pour 3-4 livres
- [ ] Optimiser: utiliser `lazy()` avec React.lazy() pour code-splitting
- [ ] Documenter dans README.md

## 🎯 État du Projet

**Actuellement Implémenté:**
- ✅ 73 livres bibliques listés dans `bible-books.json`
- ✅ Page `BibleBookDetail.tsx` affichant tous les chapitres
- ✅ Navigation depuis `BibleBookSelector.tsx` vers `/bible-book/:bookId`
- ⏳ **À FAIRE**: Intégration du contenu par chapitre

**Prochaines Étapes:**
1. Organiser les fichiers JSON selon structure ci-dessus
2. Créer le loader biblique
3. Ajouter l'affichage des versets par chapitre
4. Tester la navigation complète
