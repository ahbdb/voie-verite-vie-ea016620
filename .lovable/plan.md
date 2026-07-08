# Refonte Actualités & Audit — Voie Vérité Vie

## 1. Nouveau design de la section Actualités (accueil)

Remplacement complet de `NewsMagazine.tsx` par un layout plus vivant et éditorial :

- **Bandeau "À la une" pleine largeur** (hero d'article) : 1 grand visuel 16/9 avec dégradé cathédrale, titre Cinzel, badge catégorie + badge origine (🕊️ 3V / ⛪ Vatican / 📍 Pays), autoplay carrousel discret sur 2-3 vedettes.
- **Rail horizontal "Notre mouvement 3V"** (scroll-snap) — priorité absolue aux articles insérés en admin (`news_posts`).
- **Grille "Église universelle"** — Vatican, Aleteia, La Croix… (2 colonnes desktop / 1 mobile, cartes 4/5 avec image).
- **Grille "Église locale — {pays}"** — filtrée sur le pays de l'utilisateur.
- **Fallback image intelligent** : si `image_url` absent, on tente `og:image` scrapé côté fonction ; sinon visuel généré depuis un dégradé cathédrale + icône catégorie (jamais de carte "vide").
- Placeholder image proxy `wsrv.nl` avec `onError` → visuel gradient (déjà en place, amélioré).

## 2. Ciblage géographique des actualités

**Schéma** (migration) :
- `rss_articles.country TEXT` (nullable = universel, ex. `FR`, `CM`, `IT`)
- `news_posts.country TEXT` (nullable = universel — les articles du mouvement sont mondiaux par défaut)
- Index `(country, published_at desc)` sur les deux tables.

**Sources RSS étendues par pays** (côté `fetch-news`) :
```
Universel   : Vatican News FR, Aleteia FR, Zenit
France      : La Croix, Famille Chrétienne, iMédia, KTO
Italie      : Vatican News IT, Avvenire, ACI Stampa
Cameroun    : Cameroun Catholique, SCEAM
Côte d'Ivoire, Sénégal, RDC : diocèses locaux disponibles
Belgique    : Cathobel
Suisse      : cath.ch
Canada      : Radio VM, ECDQ
```
Chaque source est taguée avec un `country` (ou `null` = universel). Le `fetch-news` insère le pays dans `rss_articles.country`.

**Hook `useArticles`** repensé :
- Reçoit `country` (depuis `profiles.country` de l'utilisateur connecté, sinon fallback détection navigateur `navigator.language`).
- Retourne 3 groupes triés : `movement` (news_posts), `universal` (rss country=null), `local` (rss country = pays user).
- Fusion, dédoublonnage par `external_url`.

## 3. Admin — suppression massive & par plage de dates

Refonte `AdminNews.tsx` :
- **Checkbox par ligne** + checkbox "tout sélectionner".
- **Barre d'action flottante** quand ≥1 sélection : `Supprimer (N)`, `Dépublier (N)`, `Publier (N)`, `Mettre à la une (N)`.
- **Filtres en haut** : catégorie, pays, statut (publié/brouillon), source (`news_posts` vs `rss_articles`), **plage de dates** (from/to).
- **Bouton "Supprimer par filtre"** : supprime tout ce qui matche les filtres actifs (confirmation modale explicite avec nb d'items).
- Une seule confirmation → une seule requête (`.in('id', ids)` ou `.lte/.gte('published_at')`).
- L'admin peut supprimer aussi bien dans `news_posts` que dans `rss_articles` depuis la même vue unifiée.

## 4. Auto-suppression accélérée

Nouvelle politique côté `cleanup-articles` (cron 30 min au lieu de 24 h) :
- **rss_articles > 2 jours** → suppression physique dès qu'il y a au moins 20 articles plus récents dans la même catégorie/pays (garantit qu'on ne vide pas quand rien de neuf n'arrive).
- **rss_articles absents du flux depuis 24 h** → suppression.
- **Lien 404/410** → suppression immédiate (au lieu de 3 échecs).
- **news_posts** : jamais supprimé auto (seulement dépublié après 90 j, comme aujourd'hui).
- Cron reprogrammé toutes les **30 min** ; `fetch-news` déclenche `cleanup-articles` en fin d'exécution pour purge immédiate après ingestion.

## 5. Audit & corrections diverses

**Notifications** :
- Vérifier que `send-push-notification` reçoit bien les tokens (le fix précédent a corrigé le SW en preview mais pas la production Android).
- Ajouter log d'échec côté `fcm_tokens` (colonne `last_error`) — déjà présente ? Sinon migration.
- Notifier automatiquement les articles `featured=true` du mouvement 3V (edge trigger à l'insert).

**Incohérences détectées à corriger** :
- `NewsMagazine` : dédoublonnage manquant quand un article DB partage un `external_url` avec un rss (fait dans `useArticles`, mais pas re-vérifié après filtrage catégorie).
- Images RSS iMédia/Vatican souvent absentes : ajouter parsing `<media:content>`, `<itunes:image>`, `<image><url>` dans `fetch-news`.
- `AdminNews.tsx` — l'appel `handleImportRss` fait un fallback client qui écrit dans `news_posts` (mauvaise table), doit écrire dans `rss_articles`.
- Bouton "Gérer" en tant qu'admin sur la home : lien direct vers `/admin/news` ✅ (OK).

## Détails techniques

**Migration SQL** (à valider) :
```sql
ALTER TABLE public.rss_articles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.news_posts   ADD COLUMN IF NOT EXISTS country TEXT;
CREATE INDEX IF NOT EXISTS idx_rss_country_pub  ON public.rss_articles(country, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_country_pub ON public.news_posts(country, published_at DESC);
```

**Fichiers touchés** (~10) :
- `supabase/migrations/…_articles_country.sql` (nouveau)
- `supabase/functions/fetch-news/index.ts` (sources+country+meilleur parsing image)
- `supabase/functions/cleanup-articles/index.ts` (règles serrées)
- `artifacts/3v-app/src/hooks/useArticles.ts` (groupes 3V/universel/local)
- `artifacts/3v-app/src/components/NewsMagazine.tsx` (nouveau design 3 sections)
- `artifacts/3v-app/src/pages/admin/AdminNews.tsx` (multi-sélection, filtres, purge)
- `artifacts/3v-app/src/pages/Index.tsx` (branchement country)
- Cron: reprogrammation via `supabase--insert`.

Aucune donnée existante perdue (colonnes ajoutées nullables).

## Ce qui n'est PAS inclus (à confirmer si besoin)

- Redesign du reste de la page d'accueil (hero, mission, activités) — reste tel quel.
- Réécriture complète du système de notifications push — seulement audit + corrections ponctuelles. Un chantier complet devra être demandé séparément.
