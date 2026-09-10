# Journal des modifications

Les versions distribuées de TryCast, la plus récente en tête. Le numéro suit le
semver (MAJEUR.MINEUR.CORRECTIF) et reflète `app.json` → `expo.version`.

Le numéro de build (`versionCode`) n'apparaît pas ici : il est attribué par EAS
à chaque build de production, et n'est jamais écrit dans le dépôt.

Écrit par `npm run release`, à partir des `--notes` passées à la commande.

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
