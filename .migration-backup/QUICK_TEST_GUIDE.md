# 🧪 Guide de Test Rapide - Bible Interactive

## ✅ Tests de Vérification du Build

### Test 1: Build Réussit
```bash
cd /workspaces/voie-verite-vie
npm run build
```

**Attendu**: ✓ 1870 modules transformed, built in ~6s

### Test 2: Pas d'Erreurs TypeScript
```bash
npm run type-check
```

**Attendu**: 0 erreurs

### Test 3: Dev Server Lance
```bash
npm run dev
```

**Attendu**: Localhost:5173 accessible

---

## 🧭 Scénario de Test Utilisateur

### Étape 1: Navigation vers Lecture Biblique
1. Ouvrir http://localhost:5173
2. Cliquer sur "Lecture Biblique" (Navigation)
3. **Vérifier**: Page charge correctement

### Étape 2: Accéder aux 73 Livres
1. Sur page Lecture Biblique, voir 2 onglets
2. Cliquer sur onglet **"73 Livres"**
3. **Vérifier**: Composant BibleBookSelector s'affiche
4. **Vérifier**: Compteur affiche "73 livres"

### Étape 3: Rechercher un Livre
1. Dans le champ de recherche, taper **"genese"**
2. **Vérifier**: Affiche "Genèse" (Gn) seul
3. Taper **"mat"** → affiche "Matthieu" et autres
4. Effacer et taper **"jean"** → affiche "Jean" (Jn)

### Étape 4: Cliquer sur un Livre
1. Chercher et trouver **"Genèse"**
2. Cliquer sur la carte "Genèse Chapitres 1-50"
3. **Vérifier**: Navigation vers `/bible-book/1` (voir URL)
4. **Vérifier**: Grille de 50 boutons affichée

### Étape 5: Cliquer sur un Chapitre
1. Sur la page Genèse, cliquer sur bouton **"3"** (chapitre 3)
2. **Attendu (actuellement)**: Message "non disponible" (car fichiers pas encore placés)
3. **Ou**: Affiche les versets si fichiers présents

### Étape 6: Vérifier le Retour
1. Cliquer bouton **"Retour aux chapitres"**
2. **Vérifier**: Revenir à la grille des chapitres

### Étape 7: Test Chat IA
1. Se connecter avec compte Supabase
2. Cliquer **"Assistant IA"** dans Navigation
3. **Vérifier**: Navigation vers `/ai-chat` fonctionne
4. **Vérifier**: Pas de redirection vers home

---

## 🔍 Vérifications Détaillées

### Vérification: Comptage des Livres

#### Tab "Tous"
```
Titré: "Tous (73)"
```
**Attendu**: 73 cartes dans la grille

#### Tab "Ancien"
```
Testament Ancien
Attendu: 39 livres (Genèse → Malachie + Baruch)

Livres Deutérocanoniques
Attendu: Peut avoir 0-7 livres selon version
```

#### Tab "Nouveau"
```
Attendu: 27 livres (Matthieu → Apocalypse)
```

### Vérification: Identifiants
Cliquer sur "Genèse" et vérifier dans URL:
```
http://localhost:5173/bible-book/1
```

Cliquer sur "Matthieu" et vérifier:
```
http://localhost:5173/bible-book/40
```

Cliquer sur "Apocalypse" et vérifier:
```
http://localhost:5173/bible-book/66
```

### Vérification: Nombres de Chapitres
Sur chaque page `/bible-book/:id`, compter les boutons:

| Livre | ID | Chapitres | Boutons |
|-------|----|-----------| --------|
| Genèse | 1 | 50 | 50 |
| Psaumes | 19 | 150 | 150 |
| Lamentations | 24 | 5 | 5 |
| Actes | 44 | 28 | 28 |
| Apocalypse | 66 | 22 | 22 |

---

## 🐛 Dépannage

### Problème: "Lettres de Jérémie" encore visible
**Solution**: Vérifier que `bible-books.json` a bien supprimé cette entrée
```bash
grep -i "jérémie\|letter" src/data/bible-books.json
# Doit retourner: 0 résultats
```

### Problème: Plus de 73 livres affichés
**Solution**: Vérifier le fichier JSON
```bash
jq '.books | length' src/data/bible-books.json
# Doit retourner: 73
```

### Problème: IDs Nouveau Testament incorrects
**Solution**: Vérifier que Matthieu a id=40 (pas 41)
```bash
jq '.books[] | select(.name == "Matthieu") | .id' src/data/bible-books.json
# Doit retourner: 40
```

### Problème: Chat IA ne charge pas
**Solution**: Vérifier console pour erreurs
```
F12 → Console → Chercher erreurs rouges
```
Vérifier que vous êtes connecté avant d'accéder

### Problème: Chapitre affiche vide/erreur
**Raison**: Fichiers bibliques pas encore placés (normal)
**Test**: Créer fichier `01-genesis.json` de test
```json
{
  "id": 1,
  "name": "Genèse",
  "abbreviation": "Gn",
  "chapters": [
    {
      "number": 1,
      "verses": [
        {"number": 1, "text": "Au commencement..."},
        {"number": 2, "text": "La terre était..."}
      ]
    }
  ]
}
```

---

## 📋 Checklist de Test Complète

- [ ] Build réussit (npm run build)
- [ ] 73 livres comptabilisés
- [ ] Tab "Tous" affiche 73 cartes
- [ ] Tab "Ancien" affiche 39 + n livres
- [ ] Tab "Nouveau" affiche 27 cartes
- [ ] Recherche "genese" → filtre 1 résultat
- [ ] Clic sur Genèse → navigate vers /bible-book/1
- [ ] Page Genèse affiche 50 boutons
- [ ] Clic sur chapitre 3 → charge contenu (ou erreur attendue)
- [ ] Bouton "Retour" → revient à grille
- [ ] Chat IA accessible si connecté
- [ ] Chat IA redirige vers /auth si déconnecté
- [ ] Pas d'erreur dans console (F12)
- [ ] Design responsive sur mobile

---

## 🚀 Test de Performance

### Temps de Chargement Page
```bash
# Ouvrir DevTools (F12) → Network
# Naviguer vers /bible-book/1
# Observer temps de chargement

Attendu: <1s (just metadata)
```

### Temps de Chargement Chapitre
```bash
# Avec fichier JSON présent, cliquer sur chapitre
# Observer temps d'affichage

Attendu: <300ms (cached) ou <1s (first load)
```

---

## 📸 Screenshots à Vérifier

### Screenshot 1: Page Lecture Biblique
- [ ] Onglet "73 Livres" visible
- [ ] Champ de recherche visible
- [ ] Composant BibleBookSelector chargé

### Screenshot 2: Grille de Livres
- [ ] 73 cartes affichées
- [ ] Chaque carte montre: Nom, Abréviation, Chapitres
- [ ] Hover effect fonctionne

### Screenshot 3: Page Livre (ex: Genèse)
- [ ] Titre "Genèse" avec badge "Gn"
- [ ] "50 chapitres" affiché
- [ ] Grille responsive (4-6-8 colonnes selon écran)
- [ ] Tous les 50 boutons présents

### Screenshot 4: Chapitre Affiché
- [ ] Titre "Genèse 1" avec retour
- [ ] Numéros de versets dans badges
- [ ] Texte des versets visible
- [ ] Boutons Copier/Partager

---

## 🔄 Régressions à Éviter

### Avant de Valider, Vérifier:
- [ ] Autres pages ne sont pas cassées (Accueil, About, Contact, etc.)
- [ ] Authentification fonctionne toujours
- [ ] Admin dashboard fonctionne
- [ ] Prayer Forum fonctionne
- [ ] Pas de console errors

---

## 📝 Notes de Test

```
Tester effectué le: [DATE]
Par: [NOM]
Device: [PC/Mac/Mobile]
Browser: [Chrome/Firefox/Safari]
Version: [vX.X.X]

Observations:
- ...
- ...

Bugs trouvés:
- ...

Recommandations:
- ...
```

---

**Fin du guide de test rapide!** ✅

Une fois tous les tests passés, votre Bible interactive est prête! 🎉
