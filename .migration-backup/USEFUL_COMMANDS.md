# 🔧 Commandes Utiles - Bible Integration

## 🏗️ Préparation Structure

### Créer les dossiers bibliques
```bash
mkdir -p src/data/bible-content/{old-testament,new-testament,apocrypha}\n```

### Vérifier les dossiers
```bash
tree src/data/bible-content/ -L 2
```

---

## ✅ Validation

### Vérifier le nombre de livres
```bash
jq '.books | length' src/data/bible-books.json
# Doit afficher: 73
```

### Vérifier un livre spécifique
```bash
jq '.books[] | select(.name == "Genèse")' src/data/bible-books.json
# Doit afficher: id: 1, name: "Genèse", abbreviation: "Gn", chapters: 50
```

### Vérifier Matthieu (premier NT)
```bash
jq '.books[] | select(.name == "Matthieu")' src/data/bible-books.json
# Doit afficher: id: 40 (pas 41!)
```

### Chercher "Lettres de Jérémie"
```bash
grep -i "jérémie\|letter" src/data/bible-books.json
# Doit retourner: 0 résultats
```

---

## 📁 Organisation Fichiers Bibliques

### Créer fichier de test (Genèse)
```bash
cat > src/data/bible-content/old-testament/01-genesis.json << 'EOF'
{
  "id": 1,
  "name": "Genèse",
  "abbreviation": "Gn",
  "chapters": [
    {
      "number": 1,
      "verses": [
        {"number": 1, "text": "Au commencement, Dieu créa les cieux et la terre."},
        {"number": 2, "text": "La terre était informe et vide; les ténèbres couvraient la surface de l'abîme, et l'esprit de Dieu se mouvait au-dessus des eaux."}
      ]
    }
  ]
}
EOF
```

### Vérifier JSON valide
```bash
jq . src/data/bible-content/old-testament/01-genesis.json > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
```

### Compter les fichiers placés
```bash
find src/data/bible-content -name "*.json" | wc -l
# Attendu: 0 au départ, puis augmente à 66 après placement
```

---

## 🧪 Test et Validation

### Démarrer le serveur de développement
```bash
npm run dev
# Puis ouvrir: http://localhost:5173
```

### Vérifier le build
```bash
npm run build
# Attendu: ✓ 1870 modules, built in ~6s
```

### Vérifier les types TypeScript
```bash
npm run type-check
# Attendu: 0 erreurs
```

### Lancer linter ESLint
```bash
npm run lint
# Attendu: 0 erreurs critiques
```

---

## 📋 Dépannage

### Chercher erreurs TypeScript
```bash
npm run build 2>&1 | grep -i "error"
```

### Chercher warnings
```bash
npm run build 2>&1 | grep -i "warning"
```

### Vérifier import d'un fichier
```bash
jq . src/data/bible-content/old-testament/01-genesis.json | head -20
```

### Valider tous les fichiers JSON
```bash
for file in src/data/bible-content/**/*.json; do
  jq . "$file" > /dev/null || echo "Invalid: $file"
done
```

---

## 🚀 Optimisation Fichiers

### Compresser en gzip
```bash
gzip -9 src/data/bible-content/**/*.json
```

### Voir taille avant/après compression
```bash
du -sh src/data/bible-content/
# Avant gzip (estimé): 30-50 MB
# Après gzip: 10-15 MB (60-70% économisé)
```

### Décompresser si besoin
```bash
gunzip src/data/bible-content/**/*.json.gz
```

---

## 🔄 Git/Versionning

### Vérifier les fichiers modifiés
```bash
git status
# Chercher: BibleBookSelector.tsx, BibleBookDetail.tsx, AIChat.tsx, etc.
```

### Voir les changements Bible
```bash
git diff src/data/bible-books.json | head -50
```

### Commit des changements
```bash
git add -A
git commit -m "feat: Bible integration with 73 books and interactive navigation"
```

### Brancher pour Bible content (optionnel)
```bash
git checkout -b feature/bible-content
# Travailler sur les fichiers JSON
# Puis: git merge feature/bible-content
```

---

## 📊 Statistiques

### Taille du bundle
```bash
npm run build 2>&1 | grep -A 10 "assets/"
# Chercher la taille du .js
```

### Nombre de modules
```bash
npm run build 2>&1 | grep "modules"
# Attendu: ✓ 1870 modules
```

### Analyse détaillée
```bash
npm run build -- --analyze
# (si plugin analyse disponible)
```

---

## 🧬 Inspection Code

### Chercher tous les imports BibleChapterViewer
```bash
grep -r "BibleChapterViewer" src/
# Doit trouver: BibleBookDetail.tsx
```

### Chercher tous les useParams
```bash
grep -r "useParams" src/
# Doit trouver: BibleBookDetail.tsx
```

### Chercher loadBibleChapter
```bash
grep -r "loadBibleChapter" src/
# Doit trouver: BibleChapterViewer.tsx
```

---

## 🔐 Sécurité/Qualité

### Audit dépendances
```bash
npm audit
# Chercher vulnérabilités
```

### Outdated packages
```bash
npm outdated
# Voir quels packages sont à jour
```

### Test de type strict
```bash
npm run type-check
```

---

## 📱 Test Responsive

### Prévisualiser sur mobile (DevTools)
```
F12 → Device Toolbar (Ctrl+Shift+M)
→ iPhone 12 / iPad / Android
→ Tester navigation /bible-book/1
```

### Tester viewport étroit
```
DevTools → Dimensions custom
Tester: 320px, 480px, 768px, 1024px
```

---

## 🔗 URLs de Test

### Accueil
```
http://localhost:5173/
```

### Lecture Biblique (73 Livres)
```
http://localhost:5173/biblical-reading
→ Cliquer onglet "73 Livres"
```

### Genèse (ID: 1)
```
http://localhost:5173/bible-book/1
```

### Matthieu (ID: 40)
```
http://localhost:5173/bible-book/40
```

### Apocalypse (ID: 66)
```
http://localhost:5173/bible-book/66
```

### Chat IA (Connecté)
```
http://localhost:5173/ai-chat
# (Seulement si authentifié)
```

---

## 🐛 Debug Console

### Dans F12 Console:

```javascript
// Vérifier window location
console.log(window.location.pathname)

// Tester loader biblique
import { loadBibleBook } from '@/lib/bible-content-loader'
loadBibleBook(1).then(content => console.log(content))

// Vérifier localStorage
console.log(localStorage)
```

---

## 📈 Monitoring Performance

### Temps de load page
```
F12 → Network → Recharger (Ctrl+Shift+R)
Observer temps par ressource
```

### Performance timeline
```
F12 → Performance → Enregistrer profil
Naviguer dans app
Voir où le temps est dépensé
```

### Lighthouse score
```
F12 → Lighthouse → Generate report
Checker Performance, Accessibility, Best Practices
```

---

## 🛠️ Récapitulatif Commandes Essentielles

### Installation & Dev
```bash
npm install
npm run dev          # Démarrer dev server
```

### Build & Deploy
```bash
npm run build        # Compiler pour production
npm run preview      # Prévisualiser build
```

### Code Quality
```bash
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

### Validation Bible
```bash
jq '.books | length' src/data/bible-books.json  # Doit = 73
jq '.books[39]' src/data/bible-books.json       # Doit = Matthieu id 40
```

---

**Bookmarquez cette page pour référence rapide!** 🔖

