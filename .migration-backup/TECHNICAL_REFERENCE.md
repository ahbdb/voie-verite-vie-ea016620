# 🛠️ Référence Technique - Architecture Bible Interactive

## 📦 Composants Créés/Modifiés

### 1. `BibleChapterViewer.tsx` 
**Location**: `src/components/BibleChapterViewer.tsx`
**Type**: Composant React fonctionnel
**Props**:
```typescript
interface BibleChapterViewerProps {
  bookId: number;           // ID du livre (1-66)
  bookName: string;         // Nom affiché
  abbreviation: string;     // Code court (Gn, Mt, etc.)
  chapterNumber: number;    // Numéro du chapitre
  onBack: () => void;       // Callback pour retour
}
```

**Imports Requis**:
- `loadBibleChapter` from `@/lib/bible-content-loader`
- Composants Shadcn/ui (Card, Button, ScrollArea, etc.)

**Features**:
- Scroll area de 600px
- Badges numérotés pour versets
- Boutons Copier/Partager au hover
- Gestion d'erreur avec messages

---

### 2. `bible-content-loader.ts`
**Location**: `src/lib/bible-content-loader.ts`
**Type**: Utilitaire TypeScript

**Exports Principaux**:
```typescript
loadBibleBook(bookId: number): Promise<BibleBookContent | null>
loadBibleChapter(bookId: number, chapterNumber: number): Promise<BibleVerse[] | null>
loadBibleVerse(bookId, ch, v): Promise<string | null>
loadBibleBookCached(bookId): Promise<BibleBookContent | null>
clearBibleCache(): void
```

**Interfaces**:
```typescript
interface BibleVerse {
  number: number;
  text: string;
}

interface BibleChapter {
  number: number;
  verses: BibleVerse[];
}

interface BibleBookContent {
  id: number;
  name: string;
  abbreviation: string;
  chapters: BibleChapter[];
}
```

**Mapping IDs→Fichiers**:
- OT (1-39): `old-testament/`
- NT (40-66): `new-testament/`
- Apocrypha (39+): `apocrypha/`

**Format Import Dynamique**:
```typescript
// Exemple: pour Genèse (id=1)
import(`@/data/bible-content/old-testament/01-genesis.json`)
```

---

### 3. `BibleBookDetail.tsx` (Modifié)
**Location**: `src/pages/BibleBookDetail.tsx`
**Type**: Page React

**State Ajouté**:
```typescript
const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
```

**Logique**:
- Si `selectedChapter === null` → Affiche grille de chapitres
- Si `selectedChapter !== null` → Affiche `BibleChapterViewer`
- Bouton "Retour" → `setSelectedChapter(null)`

**Grille de Chapitres**:
```tsx
<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
  {chapters.map((ch) => (
    <Button onClick={() => setSelectedChapter(ch)}>
      {ch}
    </Button>
  ))}
</div>
```

---

### 4. `BibleBookSelector.tsx` (Modifié)
**Location**: `src/components/BibleBookSelector.tsx`
**Type**: Composant sélecteur

**Ajouts**:
```typescript
import { useNavigate } from 'react-router-dom';

const handleBookClick = (book: BookData) => {
  navigate(`/bible-book/${book.id}`);
  onBookSelect?.(book);  // Callback optionnel
};
```

**Remplacements onClick**:
Avant: `onClick={() => onBookSelect?.(book)}`
Après: `onClick={() => handleBookClick(book)}`

**Emplacements** (4 endroits):
1. Tab "Tous" (Old + New Testament)
2. Tab "Ancien" - Livres OT
3. Tab "Ancien" - Livres Deutérocanoniques
4. Tab "Nouveau" - Livres NT

---

### 5. `AIChat.tsx` (Corrigé)
**Location**: `src/pages/AIChat.tsx`
**Type**: Page chat

**Changement**:
```typescript
// Avant
const { user } = useAuth();
useEffect(() => { 
  if (!user) navigate('/auth'); 
  else loadConversations(); 
}, [user, navigate]);

// Après
const { user, loading } = useAuth();
useEffect(() => { 
  if (!loading) {
    if (!user) navigate('/auth');
    else loadConversations();
  }
}, [user, loading, navigate]);
```

**Raison**: Attendre le chargement de l'authentification avant de rediriger

---

## 🗂️ Structure de Dossiers Recommandée

```
src/
├── data/
│   ├── bible-books.json                    ✅ EXISTANT (73 livres)
│   └── bible-content/                      📁 À CRÉER
│       ├── old-testament/                  (39 fichiers)
│       │   ├── 01-genesis.json
│       │   ├── 02-exodus.json
│       │   ├── ...
│       │   └── 39-baruch.json
│       └── new-testament/                  (27 fichiers)
│           ├── 40-matthew.json
│           ├── 41-mark.json
│           ├── ...
│           └── 66-revelation.json
├── lib/
│   ├── bible-content-loader.ts             ✅ CRÉÉ
│   ├── logger.ts                           ✅ EXISTANT
│   └── validation.ts                       ✅ EXISTANT
└── components/
    ├── BibleBookSelector.tsx               ✅ MODIFIÉ
    └── BibleChapterViewer.tsx              ✅ CRÉÉ
```

---

## 🔀 Flux de Données Bibliques

### 1️⃣ Sélection du Livre

```
User clicks on card in BibleBookSelector
  ↓
handleBookClick(book)
  ↓
navigate(`/bible-book/${book.id}`)
  ↓
BibleBookDetail loaded with :bookId param
```

### 2️⃣ Chargement du Livre

```
BibleBookDetail useEffect
  ↓
Cherche book dans bible-books.json par id
  ↓
Affiche grille interactive de chapitres
```

### 3️⃣ Sélection d'un Chapitre

```
User clicks chapter button
  ↓
setSelectedChapter(chapterNumber)
  ↓
BibleChapterViewer is rendered
```

### 4️⃣ Chargement du Contenu

```
BibleChapterViewer useEffect
  ↓
loadBibleChapter(bookId, chapterNumber)
  ↓
bible-content-loader.ts
  ↓
import(`/old-testament/XX-bookname.json`)
  ↓
Extrait chapter[chapterNumber-1].verses
  ↓
Rendu avec numérotation et actions
```

---

## 🔌 Intégration des Fichiers JSON

### Format Attendu

```json
{
  "id": 1,
  "name": "Genèse",
  "abbreviation": "Gn",
  "chapters": [
    {
      "number": 1,
      "verses": [
        { "number": 1, "text": "Au commencement..." },
        { "number": 2, "text": "La terre était..." }
      ]
    },
    { "number": 2, "verses": [...] },
    ...
    { "number": 50, "verses": [...] }
  ]
}
```

### Parsing du Loader

```typescript
// 1. Import dynamique
const module = await import(`@/data/bible-content/old-testament/01-genesis.json`)
const bookContent = module.default

// 2. Extraction chapitre
const chapter = bookContent.chapters.find(c => c.number === 3)

// 3. Retour des versets
return chapter?.verses || null
```

---

## ⚙️ Points Techniques Clés

### 1. Paramétrage des Routes
```typescript
// App.tsx
<Route path="/bible-book/:bookId" element={<BibleBookDetail />} />

// BibleBookDetail.tsx
const { bookId } = useParams<{ bookId: string }>();
const book = bibleBooks.books.find(b => b.id === parseInt(bookId))
```

### 2. Import Dynamique de JSON
```typescript
// Pas de require(), utiliser import()
const module = await import(
  `@/data/bible-content/old-testament/01-genesis.json`
)
return module.default
```

### 3. Caching en Mémoire
```typescript
const bookCache: Map<number, BibleBookContent | null> = new Map()

export const loadBibleBookCached = async (bookId: number) => {
  if (bookCache.has(bookId)) return bookCache.get(bookId)
  const content = await loadBibleBook(bookId)
  bookCache.set(bookId, content)
  return content
}
```

### 4. Gestion d'Erreur
```typescript
try {
  const chapterVerses = await loadBibleChapter(bookId, chapterNumber)
  if (!chapterVerses) {
    setError(`Chapitre ${chapterNumber} non disponible`)
  }
} catch (err) {
  setError(`Erreur: ${err.message}`)
}
```

---

## 📊 Tailles de Fichier (Estimé)

| Composant | Taille | Notes |
|-----------|--------|-------|
| `BibleBookSelector.tsx` | ~3 KB | Composant simple |
| `BibleChapterViewer.tsx` | ~5 KB | Afficheur versets |
| `bible-content-loader.ts` | ~8 KB | Utilitaire |
| Génèse JSON (50 ch × 31k avg) | ~1.5 MB | Testament Ancien |
| Matthieu JSON (28 ch × 25k avg) | ~0.7 MB | Testament Nouveau |
| **Total Bible (66 livres)** | **~30-50 MB** | Poids total |

⚠️ **Bundle Size Warning**: Si trop volumineux, utiliser code-splitting

---

## 🚀 Optimisations Possibles

### 1. Code-Splitting
```typescript
// Importer dynamiquement BibleChapterViewer
const BibleChapterViewer = lazy(() => 
  import('@/components/BibleChapterViewer')
)

<Suspense fallback={<Loading />}>
  <BibleChapterViewer ... />
</Suspense>
```

### 2. Virtualisation (pour gros chapitres)
```typescript
// Si >100 versets, utiliser react-virtual
import { useWindowVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useWindowVirtualizer({
  count: verses.length,
  estimateSize: () => 50,
})
```

### 3. Compression
```bash
# Gzip les fichiers JSON
gzip src/data/bible-content/**/*.json

# Ou utiliser Brotli
brotli --best src/data/bible-content/**/*.json
```

---

## 🧪 Testing

### Test 1: Navigation
```typescript
// Test si route existe
test('Navigate to /bible-book/1', () => {
  render(<BibleBookDetail />)
  navigate('/bible-book/1')
  expect(window.location.pathname).toBe('/bible-book/1')
})
```

### Test 2: Chargement Chapitre
```typescript
test('Load Genesis chapter 1', async () => {
  const verses = await loadBibleChapter(1, 1)
  expect(verses).toBeTruthy()
  expect(verses[0].number).toBe(1)
})
```

### Test 3: Erreur
```typescript
test('Handle missing chapter gracefully', async () => {
  const verses = await loadBibleChapter(1, 999)
  expect(verses).toBeNull()
})
```

---

## 📚 Références et Normes

### Naming Conventions
- **Fichiers**: `XX-bookname.json` (ex: `01-genesis.json`)
- **IDs**: Numérotation continue 1-66 (ou 73 avec deutérocanoniques)
- **Abbreviations**: `Gn`, `Mt`, `Rm`, etc.

### JSON Standards
- UTF-8 encoding
- Keys camelCase: `chapterNumber`, `verseText`
- Pas de trailing commas
- Valide selon `jq` ou JSON schema

---

## 🔗 Dépendances

### Requises
- `react-router-dom` (v6.30.1+) - Navigation paramétrisée
- `shadcn/ui` - Composants UI

### Optionnelles
- `@tanstack/react-virtual` - Virtualisation pour gros chapitres
- `react-aria` - Accessibilité améliorée
- `zustand` - State management optionnel

---

## 💾 Notes pour le Développement Futur

1. **Lazy Loading**: Importer chapitres à la demande, pas tout le livre
2. **Service Worker**: Cacher les livres téléchargés pour mode offline
3. **Search**: Ajouter index full-text avec Lunr.js
4. **Annotations**: Stocker notes/surlignages dans Supabase
5. **Synchronisation**: Sync bookmarks/notes entre appareils

---

**Cette architecture est prête à supporter une Bible complète et interactive avec des millions d'utilisateurs!** 🚀

