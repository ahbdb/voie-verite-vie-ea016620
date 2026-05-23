# Guide d'Utilisation - Lecteur Biblique

## 📖 Nouvelles Fonctionnalités

### 1. Programme de Lecture 354 Jours
**Onglet**: "Programme 354j"

L'application inclut un programme de lecture biblique sur 354 jours qui couvre complètement la Bible catholique.

**Fonctionnalités**:
- ✅ Suivi de la progression en temps réel
- ✅ Marquer les lectures comme complétées
- ✅ Quizzes pour évaluer la compréhension
- ✅ Filtrage par mois et testament
- ✅ Visualisation du progrès avec barres d'avancement

### 2. Explorateur des 73 Livres Bibliques
**Onglet**: "73 Livres"

Parcourez tous les livres de la Bible catholique de manière interactive.

**Structure**:
- **39 Livres du Testament Ancien** (5 Pentateuques + 12 Historiques + 5 Sapientiaux + 16 Prophètes)
- **27 Livres du Testament Nouveau** (4 Évangiles + Actes + Épîtres + Apocalypse)
- **8 Livres Deutérocanoniques** (Tobit, Judith, Maccabées, Sagesse, Siracide, Baruch, etc.)

**Comment utiliser**:
1. Accédez à la page "Lecture Biblique"
2. Cliquez sur l'onglet "73 Livres"
3. Utilisez la recherche pour trouver un livre
4. Filtrez par Testament (Ancien, Nouveau, Tous)
5. Cliquez sur un livre pour voir ses détails (nombre de chapitres, abbréviation)

**Données**:
```json
{
  "name": "Genèse",
  "testament": "old",
  "abbreviation": "Gn",
  "chapters": 50,
  "order": 1
}
```

## 🔍 Recherche Biblique

### Fonctionnalités de Recherche

- **Par Nom**: "Genèse", "Matthieu", etc.
- **Par Abbréviation**: "Gn", "Mt", "1 S", etc.
- **Instant Search**: Résultats en temps réel
- **Filtrage par Testament**: Ancien Testament, Nouveau Testament, Tous

### Exemples de Recherche

| Recherche | Résultats |
|-----------|-----------|
| "Jean" | Jean (Évangile), 1-3 Jean, Jude |
| "Samuel" | 1 Samuel, 2 Samuel |
| "Rm" | Romains (par abbréviation) |
| "Pierre" | 1 Pierre, 2 Pierre |

## 📊 Suivi de la Progression

### Statistiques Disponibles

1. **Progression Globale**: Pourcentage complété
2. **Lectures Complétées**: Nombre actuel / 358
3. **Lectures Affichées**: Selon les filtres appliqués
4. **Lectures Restantes**: À compléter

### Progression par Mois

Chaque mois affiche:
- Nombre de lectures complétées / total
- Barre de progression visuelle
- Clic pour filtrer par mois

## 🎯 Quiz et Évaluation

### Fonctionnement des Quiz

Après avoir marqué une lecture comme complétée:
1. Un modal Quiz apparaît automatiquement
2. Sélectionnez le niveau de difficulté (Facile à Super Difficile)
3. Répondez aux questions (QCM + Réponses ouvertes)
4. Recevez une évaluation détaillée avec:
   - Score obtenu
   - Points forts identifiés
   - Domaines à améliorer
   - Points manquants

## 🛠️ Intégration Technique

### Structure des Données

#### Bible Books (`src/data/bible-books.json`)
```typescript
interface BibleBook {
  id: number;
  name: string;
  testament: 'old' | 'new';
  abbreviation: string;
  chapters: number;
  order: number;
  apocrypha?: boolean; // Livres deutérocanoniques
}
```

#### Composant Principal
- **Fichier**: `src/components/BibleBookSelector.tsx`
- **Props**: `onBookSelect?: (book: BibleBook) => void`
- **Utilisation**: 
  ```tsx
  import { BibleBookSelector } from '@/components/BibleBookSelector';
  
  <BibleBookSelector 
    onBookSelect={(book) => console.log(book)}
  />
  ```

### Base de Données

**Tables Supabase**:
- `biblical_readings`: Lectures quotidiennes (358 entrées)
- `user_reading_progress`: Suivi utilisateur
- `quiz_results`: Résultats des quiz

## 💡 Conseils d'Utilisation

### Pour une Meilleure Compréhension
1. Lisez le commentaire associé à la lecture
2. Utilisez l'onglet 73 Livres pour voir le contexte du livre
3. Complétez les quiz pour valider votre compréhension
4. Variez les niveaux de difficulté

### Organisation Recommandée
- **Ancien Testament**: Lire dans l'ordre chronologique
- **Nouveau Testament**: Commencer par les Évangiles
- **Livres Deutérocanoniques**: Inclus progressivement

### Suivi de la Progression
- Marquez régulièrement vos lectures
- Vérifiez votre progression mensuelle
- Ajustez votre rythme selon votre emploi du temps

## 🐛 Dépannage

### Les lectures ne s'affichent pas
- Vérifiez votre connexion Internet
- Rechargez la page
- Videz le cache du navigateur

### Quiz non disponible
- Assurez-vous d'avoir marqué la lecture comme complétée
- Vérifiez que vous êtes connecté
- Réessayez après quelques secondes

### Erreurs de synchronisation
- L'application utilise la synchronisation en temps réel
- Vérifiez votre connexion
- Consultez le journal des erreurs (F12 → Console)

## 📝 Notes Supplémentaires

### Canonicité des Livres
Cette application utilise le **Canon Catholique** qui inclut les 8 livres deutérocanoniques (reconnus par l'Église Catholique mais pas par les églises protestantes).

### Format des Données
- Tous les livres bibliques sont en **français**
- Les abréviations suivent les normes catholiques
- Les chapitres correspondent à la Bible Jérusalem

## 🔗 Ressources

- [Bible Jérusalem](https://www.biblisem.net/)
- [Église Catholique - Bible](https://www.vatican.va/)
- [Lectio Divina - Traditio Catholica](https://www.catholic.org/)

---

**Dernière mise à jour**: 7 Décembre 2025
**Version**: 1.0.0
