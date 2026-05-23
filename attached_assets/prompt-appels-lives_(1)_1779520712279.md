# Correction et amélioration complète de l'interface Appels Audio / Vidéo / Live

L'interface des appels audio, vidéo et lives présente plusieurs anomalies à corriger et des améliorations importantes à apporter pour obtenir une expérience fluide, logique et bien designée. Voici tout ce qui doit être traité :

---

## 1. L'administrateur qui lance l'appel ne doit pas être invité à rejoindre

Quand un administrateur lance un appel audio, vidéo ou live, le simple fait de l'avoir lancé signifie qu'il a déjà rejoint l'appel. Il ne doit donc pas voir de bouton ou d'écran lui demandant de "rejoindre". Il est directement dans l'appel dès qu'il l'a créé. C'est aux autres utilisateurs et aux autres administrateurs de rejoindre l'appel. Corriger ce comportement.

---

## 2. Cliquer sur "Terminer" doit immédiatement terminer la session pour tout le monde

Quand l'administrateur qui a lancé la session clique sur "Terminer", la session d'appel doit se terminer automatiquement et immédiatement pour tous les participants sans exception. Actuellement, la session continue de tourner et l'administrateur doit encore cliquer une deuxième fois ailleurs pour vraiment tout couper. Ce n'est pas normal. Un seul clic sur "Terminer" doit suffire pour mettre fin à la session pour tout le monde.

---

## 3. L'appel doit continuer même si un utilisateur sort de l'application sans raccrocher

Si un utilisateur est dans un appel et bascule vers une autre application (WhatsApp, appareil photo, e-mail, etc.) sans avoir cliqué sur "Raccrocher", l'appel doit continuer à tourner en arrière-plan. Il doit toujours entendre les autres participants et peut revenir dans l'application à tout moment pour reprendre la conversation normalement. La seule et unique action qui met fin à l'appel de son côté, c'est de cliquer sur "Raccrocher". C'est exactement comme WhatsApp le fait.

---

## 4. Seul l'administrateur qui a lancé la session peut la terminer — les autres peuvent seulement raccrocher

Il y a une distinction très claire entre deux rôles :

- **L'administrateur qui a lancé la session** : il est le seul à voir le bouton "Terminer la session". En cliquant dessus, il met fin à l'appel pour absolument tout le monde. Personne d'autre ne peut faire ça.
- **Tous les autres participants** (utilisateurs ordinaires et même d'autres administrateurs qui n'ont pas lancé cette session) : ils voient uniquement le bouton "Raccrocher". Raccrocher signifie qu'ils quittent l'appel eux-mêmes, mais la session continue pour les autres participants.

Ces deux boutons doivent être visuellement bien distincts, avec des couleurs et des libellés différents pour qu'il n'y ait aucune confusion possible.

---

## 5. L'appel doit continuer quand l'utilisateur navigue dans l'application

Si un utilisateur est dans un appel et navigue vers une autre page de l'application (accueil, bible, programme, etc.) sans avoir raccroché, l'appel doit continuer. Un bandeau discret doit apparaître en bas ou en haut de toutes les pages pour indiquer qu'un appel est en cours, avec la possibilité de revenir rapidement dans l'appel ou de raccrocher depuis ce bandeau.

---

## 6. Générer un lien d'invitation utilisable par des personnes non inscrites (style Zoom)

Il faut pouvoir générer un lien de partage que l'on peut envoyer à des personnes qui ne sont pas encore inscrites dans l'application. Quand ces personnes cliquent sur le lien, elles arrivent sur une belle page d'accueil qui présente la réunion et leur propose de se connecter ou de créer un compte gratuitement pour rejoindre. Cette page doit être accueillante et claire, dans le même esprit visuel que l'application.

De plus, quand une session est planifiée à une heure précise en GMT, le lien partagé doit indiquer cette heure en GMT ainsi que l'heure locale correspondante selon le fuseau horaire de l'appareil de chaque destinataire. Par exemple, si la session est à 20h00 GMT, le message partagé doit mentionner l'heure GMT et chaque personne voit automatiquement son heure locale. Ainsi chaque personne sait exactement à quelle heure l'appel démarre chez elle, que ce soit au Cameroun, en Italie, en Allemagne ou en Indonésie.

---

## 7. Les réactions emoji et les messages doivent fonctionner comme WhatsApp

- Pendant un appel ou un live, tous les participants doivent voir les réactions emoji des autres en temps réel, pas seulement soi-même.
- Un participant doit pouvoir envoyer un message pendant l'appel, le modifier après envoi avec la mention "modifié" visible, et le supprimer.
- Un participant doit pouvoir réagir à un message avec un emoji directement depuis l'interface de l'appel.
- Ces fonctionnalités doivent être accessibles sans quitter l'appel, directement depuis l'interface de la session.

---

## 8. Stabilité de la connexion audio/vidéo entre différents pays et continents

Des dissonances et des coupures surviennent pendant les appels entre participants situés dans des pays différents (Cameroun, Italie, Allemagne, Indonésie). Il faut améliorer la stabilité de la connexion pour que les appels restent fluides même à travers plusieurs continents. En cas de coupure momentanée du réseau, la connexion doit se rétablir automatiquement sans que l'utilisateur ait à faire quoi que ce soit.

---

## 9. Design de l'interface — haut de gamme, logique et moderne

L'interface des appels et du live doit être repensée visuellement pour être belle, moderne et très bien designée. Voici les exigences de design :

- **L'écran d'appel en cours** doit être épuré et immersif, avec les vidéos des participants bien mises en valeur, un fond sombre élégant et des contrôles flottants en bas d'écran comme sur WhatsApp ou FaceTime.
- **Les boutons de contrôle** (micro, caméra, raccrocher, etc.) doivent être grands, ronds, bien espacés, lisibles et accessibles même sur petit écran.
- **L'état de la connexion** doit être affiché discrètement (bonne connexion, connexion faible, reconnexion en cours) avec une icône claire et non intrusive.
- **Le chat et les réactions** pendant l'appel doivent être accessibles via un panneau latéral glissant ou un onglet, sans masquer les vidéos.
- **La page de liste des sessions** (live, planifiées, enregistrements) doit être claire, avec des cards bien structurées montrant le titre, le type (audio/vidéo/live), la date, l'heure GMT et l'heure locale, la durée estimée et les boutons d'action.
- **La page d'invitation pour les non-inscrits** doit être accueillante, avec le nom de la session, l'heure, une description et deux boutons clairs : "Se connecter" et "Créer un compte".
- **Le bandeau d'appel en cours** (visible sur toutes les pages quand un appel tourne en arrière-plan) doit être discret mais fonctionnel, avec le nom de la session, la durée écoulée et les boutons "Revenir à l'appel" et "Raccrocher".
- L'ensemble doit être cohérent avec le style visuel existant de l'application (couleurs cathédrale, typographie Cinzel, palette sombre dorée).

---

Toutes ces corrections et améliorations doivent respecter les fonctionnalités qui fonctionnent déjà bien dans l'application.

---

## 10. Suppression des appels terminés dans le menu administration

Dans le menu administration, la liste de tous les appels passés (sessions terminées) s'affiche correctement. Cependant il est actuellement impossible de supprimer ces appels terminés depuis l'interface d'administration. Il faut corriger cela. L'administrateur doit pouvoir supprimer individuellement n'importe quelle session terminée depuis le menu administration, avec une confirmation avant la suppression définitive. Le lien entre la page des appels publique et le menu administration doit également rester cohérent : ce qui est supprimé dans l'administration ne doit plus apparaître nulle part dans l'application.

---

## 11. Qualité audio parfaite pour les appels à grande échelle et à plusieurs participants simultanés

Les appels fonctionnent déjà entre plusieurs pays et continents et les participants s'entendent. Cependant il faut aller plus loin et garantir une qualité audio sans aucune anomalie dans toutes les situations, notamment :

- Quand il y a beaucoup de participants en même temps (5, 10, 20, 30, 40 personnes ou plus), chaque participant doit pouvoir entendre clairement la personne qui parle, sans que le nombre de participants dégrade la qualité ou crée des interférences.
- Quand plusieurs personnes parlent en même temps, les voix ne doivent pas se parasiter ni se couper mutuellement. Chaque voix doit rester audible et distincte.
- Il ne doit y avoir aucun écho, aucun larsen, aucune distorsion, même entre des participants situés sur des continents différents.
- La connexion ne doit jamais forcer un participant à ne plus entendre les autres à cause du nombre de personnes présentes dans l'appel.

---

## 12. Le panneau "Réseau" visible uniquement par l'administrateur principal suprême

Dans l'interface de l'appel, l'onglet ou le bouton "Réseau" (qui affiche les statistiques de connexion, les diagnostics et les informations techniques sur les pairs) doit être visible et accessible uniquement par l'administrateur principal suprême. Aucun autre utilisateur, même un administrateur ordinaire, ne doit voir cet onglet. Il doit être complètement masqué pour tout le monde sauf le rôle administrateur principal suprême.
