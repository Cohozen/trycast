---
name: trycast-release
description: Publier une version de TryCast — arbitrer entre mise à jour à distance et nouveau build par l'empreinte, bumper avec npm run release (app.json + package.json + CHANGELOG + commit + tag vX.Y.Z), workflow GitHub sur le tag, retour arrière d'une OTA ratée, et le piège invisible d'expo.version dans l'empreinte. À consulter dès qu'on prépare une release store, qu'on hésite entre ota:prod et build:prod, qu'on veut bumper la version marketing, ou qu'un correctif publié n'arrive pas chez les testeurs.
---

# Release TryCast — arbitrer, bumper, taguer

Deux compteurs, deux canaux de livraison, une seule question qui les arbitre.

| | Où | Qui l'écrit |
| --- | --- | --- |
| Version marketing (`1.0.0`) | `app.json` → `expo.version`, dupliquée dans `package.json` | `npm run release` |
| Numéro de build (`versionCode`) | **nulle part dans le dépôt** | EAS seul (`appVersionSource: "remote"` + `autoIncrement` sur le profil production) |

**Ne jamais écrire un `versionCode` ou un `buildNumber` dans le dépôt** : ce serait reprendre la
main à EAS et faire diverger le compteur de ce que connaissent les stores. Un build échoué
consomme quand même son numéro — les trous dans la séquence sont normaux, la Play Console
n'exige que la croissance.

Les deux canaux : un **build** passe par la Play Console et remplace le binaire ; une **mise à
jour à distance** (`npm run ota:prod`) remplace le seul bundle JS, en quelques secondes, sans
relecture. La question qui décide n'est jamais la sévérité du correctif. C'est l'empreinte.

## L'empreinte décide, et son échec est MUET

`runtimeVersion.policy = "fingerprint"` : une mise à jour n'est délivrée qu'aux builds portant la
**même empreinte**. Quand elle diffère, rien ne casse et rien ne s'affiche — la mise à jour
n'arrive simplement jamais. On ne le découvre qu'en constatant l'absence du correctif.

```bash
npx expo-updates fingerprint:generate --platform android   # → { sources: […], hash }
npm run build:list                                          # ligne Fingerprint du dernier build
```

`npm run release` fait cette comparaison à ta place et annonce laquelle des deux sorties
s'applique. Ce qui déplace légitimement l'empreinte : une dépendance native ajoutée ou retirée,
`app.json`, `eas.json`, les plugins de configuration, les assets déclarés dans la config, une
montée de SDK — et `fingerprint.config.js` lui-même. Détails dans `scripts/README.md`.

### ⚠️ `expo.version` fait partie de l'empreinte

**Vérifié le 2026-09-10** dans `@expo/fingerprint/build/sourcer/Expo.js` : la version n'est
retirée de la source `expoConfig` que si `sourceSkips` contient `ExpoConfigVersions`. Or
`fingerprint.config.js` ne déclare que `PackageJsonScriptsAll`, et la source hachée du jour
contenait bien `"version":"1.0.0"`.

**Conséquence : tout bump déplace l'empreinte.** Il n'existe donc pas de release « bumpée et
livrée en OTA » — bumper, c'est builder. Ce n'est pas un défaut : la version affichée dans
Réglages vient de `nativeApplicationVersion`, gravée dans le binaire, qu'une mise à jour à
distance ne peut pas changer. Bumper sans builder produirait une version fausse.

Le corollaire est ce qui compte au quotidien : **un correctif JS se publie sans bump**.

```
Rien de natif n'a changé ?
├─ et tu ne bumpes pas   →  npm run ota:prod -- --message "…"   (arrive au 2ᵉ lancement)
└─ et tu veux bumper     →  c'est un build. npm run release, puis npm run build:prod
Quelque chose de natif a changé ?
└─ build obligatoire, quoi qu'il arrive. Les binaires déjà distribués sont coupés des
   mises à jour tant que le nouveau n'est pas installé.
```

## MINOR ou PATCH

Le semver strict n'a pas de sens sans API publique. La règle décidable ici :

- **MINOR** — ce qu'on annonce. Ça remplit le champ « Nouveautés » de la fiche Play.
- **PATCH** — ce qu'on corrige en silence. Personne ne l'attendait.
- **MAJOR** — réservé à une refonte que les utilisateurs vivraient comme une autre app.

Pas de bump « par lot livré » : la version ne bouge qu'au moment de préparer une release store.

## La procédure

```bash
# 1. Lire ce qui s'est passé et rédiger les notes, sans rien écrire
npm run release -- --minor --notes "…" --dry-run

# 2. Pour de vrai
npm run release -- --minor --notes "Partage d'une ligue par lien" \
                            --notes "Corrige le décompte du rappel"

# 3. Ce que le script n'a pas fait, et ne fera jamais
git push --follow-tags
npm run build:prod
```

Le `--dry-run` n'est pas une politesse : il affiche les commits groupés depuis le dernier tag,
et c'est là qu'on écrit les notes. Sans lui, il faudrait se rappeler trois semaines de travail.

Ce que le script garantit — c'est la raison pour laquelle il existe, cf. l'en-tête de
`scripts/release.mjs` :

1. `app.json` et `package.json` bumpés **ensemble** (leur divergence casse `src/lib/app-version.test.ts`, qui ne faisait jusqu'ici que la constater) ;
2. les **quatre** vérifications de la CI vertes avant toute écriture ;
3. le **verdict d'empreinte**, avec les données du dernier build de production ;
4. l'entrée de `CHANGELOG.md`, le commit `chore(release): X.Y.Z` et le tag annoté `vX.Y.Z` ;
5. en cas d'échec après écriture, **l'arbre est rendu tel qu'il était** — sauf entre le commit et
   le tag, où il affiche la commande plutôt que de lancer un `git reset` de son propre chef.

Échappatoires : `--skip-checks`, `--skip-fingerprint`, `--dry-run`. Pas de `--allow-dirty`,
délibérément : un commit de release ne doit contenir que le bump et le journal.

**Les notes sont écrites pour un testeur**, pas pour un mainteneur : ce qu'il remarquera, pas ce
que le code a changé. Elles servent trois fois — journal, corps du tag, corps de la GitHub
Release — et se recopient dans le champ « Nouveautés de cette version » de la Play Console,
**plafonné à 500 caractères** (le script avertit au-delà).

⚠️ **Le dépôt est public** (`Cohozen/trycast`) et la GitHub Release l'est aussi : aucun nom réel,
aucune adresse personnelle dans les notes — même règle que `docs/rgpd/`.

## Ce que fait le tag

`git push --follow-tags` déclenche `.github/workflows/release.yml` : les quatre vérifications sur
le commit taggé, un refus si le tag ment sur `app.json`, puis la GitHub Release dont le corps est
l'entrée du journal (extraite par `node scripts/release.mjs --section=X.Y.Z`).

Un `git push` **seul** laisse le tag en local et ne déclenche rien : le workflow n'écoute que
`push: tags: ['v*']`.

## Retour arrière

| Ce qu'on veut défaire | Comment |
| --- | --- |
| Une mise à jour à distance ratée | `eas update:republish --group <id précédent>` (voir `npm run ota:list`), ou `eas update:roll-back-to-embedded --channel production` pour revenir au bundle du build |
| Un tag ou un commit de release, **non poussé** | `git tag -d vX.Y.Z && git reset --hard HEAD~1` — le commit ne contient que le bump et le journal |
| Une GitHub Release | `gh release delete vX.Y.Z` |

Ce qui **ne se défait pas** : un `versionCode` consommé (le suivant sera plus grand, c'est tout),
un AAB téléversé sur la Play Console, et un binaire déjà installé chez un testeur — dont on ne
reprend la main que par une mise à jour de même empreinte.

## Après le build

`docs/stores/play-store.md` porte tout ce qui se recopie dans la Play Console — ne pas le
dupliquer ici : champ « Nouveautés » (500 caractères), procédure de captures et ses **deux
conditions** (jamais depuis un dev client, émulateur en français), ordre de remplissage des dix
étapes, et la gestion des empreintes de signature pour les clients OAuth.

⚠️ **Déclarer toutes les empreintes SHA-1** — clé de signature actuelle, précédente, et clé
d'importation, une par client OAuth Android. N'en déclarer qu'une donne un `DEVELOPER_ERROR`
irreproductible, qui ne touche que certains testeurs.

## Réflexe de fin de session

Une release publiée s'inscrit au `DASHBOARD.md` : version, canal, et si l'empreinte a bougé — la
prochaine session doit savoir si les binaires en circulation peuvent encore recevoir une mise à
jour. C'est aussi ce qui permet de retrouver, dans six mois, pourquoi une version existe.
