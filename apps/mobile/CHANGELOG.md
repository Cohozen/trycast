# Journal des modifications

Les versions distribuées de TryCast, la plus récente en tête. Le numéro suit le
semver (MAJEUR.MINEUR.CORRECTIF) et reflète `app.json` → `expo.version`.

Le numéro de build (`versionCode`) n'apparaît pas ici : il est attribué par EAS
à chaque build de production, et n'est jamais écrit dans le dépôt.

Écrit par `npm run release`, à partir des `--notes` passées à la commande.

## 1.2.0 — 2026-09-24

- Détail d'un match : découvre ce qu'a joué la communauté (issue, score le plus joué, points moyens)
- Profil : pronos plus compacts et ton rang dans chacune de tes ligues
- Classement général chargé au fil du défilement, avatars des ligues dans les sélecteurs
- Résultats : ouverture sur le jour même, sinon sur le dernier jour joué
- Guide de démarrage plus court, en-têtes translucides

## 1.1.0 — 2026-09-23

- Point double : un joker ×2 par phase, à poser sur le match de ton choix
- Réactions sur les pronos des membres de ta ligue
- Coup de la journée : le prono le plus osé de ta ligue, annoncé par notification
- Accueil repensé : tes points, ta forme et les places gagnées sur la journée
- Points provisoires en direct pendant les matchs
- Phases finales dans les résultats de ligue
- Guide d'accueil et bouton « Signaler un problème »

## 1.0.0 — 2026-09-03

Première version distribuée, en test interne sur le Play Store.

- Pronostics au score exact, avec bonus offensif sur le nombre d'essais
- Ligues privées rejoignables par code ou par lien d'invitation
- Classements de ligue et classement général, mis à jour en direct
- Rappels avant les coups d'envoi
- Connexion par e-mail ou avec Google
- Nations Championship, Tournoi des Six Nations et route vers la Coupe du Monde 2027

> Entrée écrite après coup, à l'ouverture du journal : cette version n'a pas de
> tag `v1.0.0`. Le commit exact du binaire en circulation n'est pas identifiable
> avec certitude, et un tag faux serait pire que pas de tag — la traçabilité par
> tag commence à la version suivante. En attendant, le lien entre un build et
> son commit se lit sur `npm run build:list` (champ `gitCommitHash`).
