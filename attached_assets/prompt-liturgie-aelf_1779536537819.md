# Nouvelle page "Messe et Office" + intégration dans les appels/sessions

---

## 1. Création de la page "Messe et Office"

Créer une nouvelle page appelée **"Messe et Office"** à intégrer dans le groupe **"Pratique Spirituelle"** de l'application. Cette page affiche les textes liturgiques officiels de l'API AELF directement dans l'application, sans que l'utilisateur ait besoin d'ouvrir un autre site ou une autre application.

---

## 2. Détection automatique de la zone liturgique

L'application doit détecter automatiquement la position géographique de l'utilisateur pour sélectionner la zone liturgique correspondante parmi celles disponibles dans AELF :

- Afrique (Cameroun, pays francophones d'Afrique subsaharienne) → zone `afrique`
- France → zone `france`
- Belgique → zone `belgique`
- Canada → zone `canada`
- Luxembourg → zone `luxembourg`
- Suisse → zone `suisse`
- Monaco → zone `monaco`
- Italie, Allemagne, Indonésie et tous les autres pays → zone `romain` (Calendrier romain universel)

La zone détectée est appliquée automatiquement sans que l'utilisateur ait à faire quoi que ce soit. Elle est mémorisée dans ses préférences. Dans les cas où la détection échoue ou si l'utilisateur veut changer, un sélecteur discret lui permet de modifier manuellement sa zone.

---

## 3. Affichage automatique des textes du jour

À l'ouverture de la page, les textes du jour s'affichent automatiquement en fonction de la date actuelle et de la zone détectée. L'utilisateur n'a rien à saisir. S'il veut consulter les textes d'une autre date, un sélecteur de date avec calendrier est disponible, ainsi que des boutons rapides : "Hier", "Demain", "Dimanche prochain". Par défaut c'est toujours aujourd'hui.

---

## 4. Structure et contenu de la page

En haut de la page, afficher le nom de la fête ou du temps liturgique du jour tel que retourné par l'API (ex. "Dimanche de Pentecôte — Solennité", "Samedi, 7ème Semaine du Temps Pascal").

La page est organisée en onglets :
- **Messe** — Première lecture, Psaume, Deuxième lecture (si présente), Séquence (si présente), Évangile
- **Laudes** — Office du matin
- **Vêpres** — Office du soir
- **Complies** — Office de nuit
- **Office des Lectures** — avec lecture patristique
- **Tierce / Sexte / None** — regroupés dans un onglet secondaire

Chaque texte affiche : le titre de la section, la référence biblique en italique, l'intitulé du passage, puis le texte intégral avec une typographie optimisée pour la lecture spirituelle (police lisible, interligne généreux, fond sombre et texte clair dans le style de l'application).

---

## 5. Design

La page doit s'intégrer parfaitement dans le style visuel existant de l'application : palette sombre, accents dorés, typographie Cinzel pour les titres. Les textes liturgiques doivent être présentés avec soin, dans une atmosphère recueillie et élégante, adaptée à la lecture spirituelle.

---

## 6. Intégration dans les appels et sessions — bouton de texte contextuel

Quand un administrateur crée ou lance une session d'appel (audio, vidéo ou live), lui proposer une option facultative intitulée **"Associer un texte à cet appel"**. Cette option lui permet de choisir un contenu spirituel à partager avec tous les participants pendant l'appel. Les contenus disponibles sont :

- Les textes liturgiques du jour ou d'une date choisie (depuis l'API AELF — Messe et Office)
- Un passage de la Bible (depuis la Bible intégrée dans l'application)
- Une neuvaine (depuis les neuvaines intégrées dans l'application)
- La lecture biblique annuelle du jour (depuis le programme de lecture annuelle)
- Tout autre contenu spirituel disponible dans l'application

Une fois qu'un texte est associé à la session, un bouton apparaît **dans l'interface de l'appel en cours** pour tous les participants. Ce bouton, visible directement depuis l'écran de l'appel, permet à chaque participant d'ouvrir le texte en question sans quitter l'application ni sortir de l'appel. Le texte s'affiche dans un panneau ou une page à l'intérieur de l'application, avec le bandeau de l'appel en cours toujours visible pour pouvoir y retourner à tout moment.

Ce mécanisme garantit que les participants restent dans l'application pendant toute la durée de l'appel, ce qui maintient la connexion audio active.

---

## 7. Gestion des erreurs

Si l'API AELF est indisponible, afficher un message bienveillant invitant à réessayer. Si la détection de position échoue, proposer la zone "Calendrier romain" par défaut et inviter l'utilisateur à confirmer ou changer. Gérer le cas hors-ligne avec un message clair.
