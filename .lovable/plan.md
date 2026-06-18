## Constat actuel

Capture de la home en 950px : la barre de navigation est **cassée** (les libellés « Main », « Spiritual Practices », « Community »… s'affichent verticalement, une lettre par ligne). La section Actualités existante (carrousel auto-scroll de cartes 280-300px) fonctionne mais reste discrète, sans hiérarchie éditoriale, et accumule les articles RSS sans nettoyage.

## 1. Redesign de la page d'accueil

Aesthetic conservée (memory) : **Cathédrale moderne** — navy `--background`, gold accent, Cinzel pour titres, flattened UI, `py-6 md:py-10`, pas d'animations symboliques complexes.

Nouvelle composition verticale, du plus chaud au plus froid :

```text
┌─────────────────────────────────────────────┐
│  HEADER fixe — fix wrap des libellés nav    │
├─────────────────────────────────────────────┤
│  HERO compact                               │
│   logo + « Voie, Vérité, Vie » + verset     │
│   2 CTA (Rejoindre / Découvrir)             │
│   indicateur liturgique en chip             │
├─────────────────────────────────────────────┤
│  PROCHAINE ACTIVITÉ (carte unique large)    │
│   pulse badge si live/imminente             │
├─────────────────────────────────────────────┤
│  ACTUALITÉS — nouveau layout magazine       │
│   ┌──────────────┬───────────────┐          │
│   │              │  mini card 1  │          │
│   │   FEATURED   ├───────────────┤          │
│   │   (image     │  mini card 2  │          │
│   │   plein-     ├───────────────┤          │
│   │   cadre)     │  mini card 3  │          │
│   └──────────────┴───────────────┘          │
│   + grille 3 colonnes en-dessous (6 cartes) │
│   + tabs catégories sticky                  │
├─────────────────────────────────────────────┤
│  PRATIQUES SPIRITUELLES (4 tuiles bento)    │
│   Bible / Chapelet / Neuvaines / Lectio     │
├─────────────────────────────────────────────┤
│  COMMUNAUTÉ (Forum prières + Témoignages)   │
│   2 colonnes, aperçu live                   │
├─────────────────────────────────────────────┤
│  CTA final (don / contact)                  │
└─────────────────────────────────────────────┘
```

Détails visuels :
- **Header nav fix** : `whitespace-nowrap` + `flex-shrink-0` + menu burger dès `< lg` pour éviter l'écrasement actuel.
- **Hero** : retire le carrousel d'activité du hero (descend en section dédiée), affine le verset.
- **Section Actualités magazine** :
  - 1 carte vedette `aspect-[4/5]` avec overlay gradient navy→transparent + titre Cinzel sur l'image + badge gold catégorie
  - 3 mini-cartes verticales empilées à droite (image carrée + titre + meta)
  - En dessous : grille 3 cols × 2 lignes de cartes uniformes
  - Tabs catégorie sticky `top-16` en pill navy/gold
  - Sur mobile : stack vertical, vedette pleine largeur puis 1 col de cartes
  - Animation hover : léger lift + glow gold subtil (déjà dans le DS)
- **Bento Pratiques** : 4 tuiles avec icône gold, fond navy-deep, hover glow.

## 2. Pipeline de collecte des articles

Edge function existante `fetch-news` consolidée et nettoyée :

- **Sources DB** : `news_posts` (CRUD admin existant) — reste source de vérité éditoriale.
- **Sources RSS** : agrégées dans une nouvelle table `rss_articles` (cache serveur) au lieu d'être refetch côté client à chaque visite. Avantages : moins de CORS, plus rapide, déduplication centralisée, base pour l'auto-suppression.
- **Cron** : `pg_cron` toutes les 30 min → invoque `fetch-news` qui :
  1. Récupère les flux (Aleteia, iMédia Afrique, Famille Chrétienne)
  2. Upsert par `external_url` dans `rss_articles`
  3. Marque `last_seen_at = now()` pour chaque article présent dans le flux courant
  4. Vérifie HEAD sur `external_url` des articles non vus depuis 24h → flag `is_broken`
- **Côté client** : `useEffect` requête `rss_articles` + `news_posts` via un seul fetch Supabase, fusion + tri par `published_at`, plus de `fetch RSS` côté navigateur.

## 3. Auto-suppression (triple critère)

Nouveau cron `cleanup-articles` quotidien (02:00 UTC) :

| Critère | Action | Cible |
|---|---|---|
| Article RSS absent du flux source depuis 7 jours (`last_seen_at < now() - 7d`) | DELETE | `rss_articles` uniquement |
| `external_url` retourne 404/410 OU image cassée 3 vérifications consécutives | `is_broken = true` → DELETE après 7j | `rss_articles` + `news_posts` (dépublié, pas supprimé pour DB) |
| Article publié il y a plus de 90 jours ET `featured = false` ET pas modifié récemment | DELETE | `rss_articles` ; `news_posts` archivé (`is_published = false`) |

Les articles DB éditoriaux ne sont **jamais supprimés physiquement**, seulement dépubliés — l'admin garde l'historique.

## 4. Détails techniques

- **Migration SQL** : `rss_articles` (id, source, title, excerpt, image_url, external_url unique, category, published_at, last_seen_at, broken_check_count, is_broken, created_at) + GRANT select anon/authenticated + RLS public read, service_role write.
- **Edge functions** :
  - `fetch-news` (modif) : ingestion + marquage last_seen + check HEAD
  - `cleanup-articles` (nouveau) : applique les 3 règles, retourne stats
- **Cron** via `supabase--insert` (SQL avec project URL + anon key, pas migration).
- **Client** : nouveau composant `<NewsMagazine />` dans `src/components/`, remplace `<AssociationNewsSection />` dans `Index.tsx`. Hook `useArticles()` centralisé.
- **Header** : patch `Header.tsx` (whitespace + responsive breakpoints).
- **Admin** : ajout d'un onglet « Articles RSS » dans `AdminNews` pour voir le cache, forcer un refresh, supprimer manuellement.

## Livrables

1. Migration `rss_articles` + GRANT + RLS
2. `fetch-news` mis à jour + `cleanup-articles` déployée
3. 2 cron jobs (`fetch-news` 30min, `cleanup-articles` 1×/jour)
4. Composants `NewsMagazine`, `useArticles`, refonte `Index.tsx` complète
5. Fix `Header.tsx` (nav cassée)
6. Onglet admin RSS

Estimation : ~15 fichiers touchés/créés. Pas de rupture de données existantes (news_posts intact).