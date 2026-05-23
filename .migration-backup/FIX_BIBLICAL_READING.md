# Fix: Page Lecture Biblique ne s'affiche pas

## Problèmes identifiés et solutions

### 1. **Politique RLS trop restrictive**
**Problème:** La table `biblical_readings` avait une politique RLS qui n'autorisait l'accès qu'aux utilisateurs authentifiés (`to authenticated`), empêchant la lecture publique.

**Solution:** Créer une nouvelle politique qui autorise la lecture publique:
```sql
-- Fichier: supabase/migrations/20251210_fix_biblical_readings_rls.sql
drop policy if exists "Anyone can view readings" on public.biblical_readings;
create policy "Anyone can view readings"
on public.biblical_readings for select
using (true);
```

### 2. **Données manquantes**
**Problème:** La table `biblical_readings` était vide, donc aucune lecture à afficher.

**Solution:** Insérer les 268 lectures bibliques (programme sur ~9 mois):
```sql
-- Fichier: supabase/migrations/20251210_seed_biblical_readings.sql
INSERT INTO public.biblical_readings (day_number, date, month, year, books, chapters, chapters_count, type, comment)
VALUES
(1, '2025-11-03', 11, 2025, 'Genèse', '1-2', 2, 'AT', 'Création du monde'),
...
```

### 3. **Gestion des erreurs insuffisante**
**Problème:** Le code ne gérait pas correctement les erreurs Supabase.

**Solution:** Ajouter une gestion d'erreur robuste avec fallback au cache localStorage:
```tsx
// BiblicalReading.tsx - loadAllReadings()
const { data, error } = await supabase
  .from('biblical_readings')
  .select('...')
  .order('day_number');

if (error) {
  logger.error('Erreur Supabase: ', {}, error);
  // Essayer de charger depuis le cache si la requête échoue
  const cached = localStorage.getItem('biblical_readings_cache');
  if (cached) {
    try {
      setAllReadings(JSON.parse(cached));
    } catch (e) {
      setAllReadings([]);
    }
  }
} else if (data) {
  setAllReadings(data);
  localStorage.setItem('biblical_readings_cache', JSON.stringify(data));
}
```

## Étapes pour appliquer le fix

### Option 1: Via la console Supabase (Recommandé)

1. Aller sur https://app.supabase.com
2. Sélectionner votre projet
3. Aller à **SQL Editor**
4. Exécuter le contenu de `supabase/migrations/20251210_fix_biblical_readings_rls.sql`
5. Exécuter le contenu de `supabase/migrations/20251210_seed_biblical_readings.sql`

### Option 2: Via Supabase CLI (Si vous l'avez configuré localement)

```bash
cd /workspaces/voie-verite-vie
supabase db push
```

## Fichiers modifiés

1. **`src/pages/BiblicalReading.tsx`**
   - Amélioration de la gestion d'erreur dans `loadAllReadings()`
   - Ajout du fallback au cache localStorage

2. **Nouvelles migrations SQL**
   - `supabase/migrations/20251210_fix_biblical_readings_rls.sql` - Fix RLS
   - `supabase/migrations/20251210_seed_biblical_readings.sql` - Données

## Vérification

Après application des migrations:

1. Rafraîchissez la page `/biblical-reading`
2. Vous devriez voir les lectures bibliques s'afficher
3. Si vous êtes authentifié, vous pouvez marquer les lectures comme lues

## Prochaines étapes

- [ ] Exécuter les migrations SQL dans Supabase
- [ ] Tester la page de lecture biblique
- [ ] Vérifier que le cache localStorage fonctionne
- [ ] Valider les permissions utilisateur (marquer comme lu)
