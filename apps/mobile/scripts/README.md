# `apps/mobile/scripts/` — outillage de l'app

Scripts propres à l'app Expo : chaîne Android locale, préparation des releases et mises à jour à distance. Ils se lancent **depuis `apps/mobile`** (`npm run …`). L'outillage commun au dépôt (e-mails, E2E, seeds, typegen, veille des dépendances) est décrit dans [`scripts/README.md`](../../../scripts/README.md) à la racine.

---

## Émulateur Android et build local

| Commande | Effet |
|---|---|
| `npm run android:doctor` | Diagnostic : JDK, SDK, AVD, appareils connectés. Ne construit rien |
| `npm run android:emulator` | Démarre l'AVD et **attend qu'il soit réellement prêt** |
| `npm run android` | Compile le dev client, l'installe et lance Metro |

**Prérequis machine** — un JDK 17 (`brew install openjdk@17`). React Native 0.86 déclare une
toolchain 17 ; le JBR livré avec Android Studio est en Java 25, hors du couloir supporté.
`npm run android:doctor` le dit et donne la commande si rien n'est trouvé.

### `android-env.sh`

**Source unique de l'environnement Android**, à sourcer et non à exécuter. npm lance ses scripts via
`sh`, qui ne source pas `~/.zshrc` : sans ce fichier, `npm run android` ne voit ni Java ni le SDK,
même dans un shell interactif où tout est configuré. Il résout le JDK 17, exporte `JAVA_HOME`,
`ANDROID_HOME`/`ANDROID_SDK_ROOT`, complète le `PATH` (`platform-tools`, `emulator`), écrit
`android/local.properties` et fixe l'AVD visé.

Deux surcharges utiles : `TRYCAST_AVD=<nom>` pour viser un autre émulateur, `ANDROID_HOME=<chemin>`
pour un SDK ailleurs.

Il force aussi `ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a`. `android/gradle.properties`
en déclare quatre parce que les builds EAS visent tous les téléphones ; en local, la machine comme
l'émulateur sont en arm64, et compiler les trois autres quadruple le temps de build pour rien.
Gradle lit `ORG_GRADLE_PROJECT_<propriété>` comme propriété de projet, donc sans toucher au fichier
généré.

### `android-emulator.sh` : pourquoi attendre

`emulator` rend la main dès que la fenêtre s'ouvre, bien avant que le système ait démarré. Enchaîner
`expo run:android` à ce moment-là échoue à l'installation de l'APK, avec une erreur qui ne dit pas
qu'il s'agit d'un problème de timing. Le script boucle donc sur `sys.boot_completed` et ne rend la
main qu'appareil prêt. Il ne fait rien si un appareil est déjà connecté — un téléphone branché en
USB a la priorité.

⚠️ **Pas de `-no-snapshot-save`** : le drapeau paraît propre mais il **jette la session** et
rebascule sur le dernier instantané — le dev client installé disparaît au redémarrage et l'émulateur
retrouve son vieux build release (vécu le 2026-09-05). Le Quick Boot par défaut sauvegarde à
l'extinction, c'est ce qu'on veut.

### `android-preflight.sh` : échouer vite

Branché dans `npm run android`, avant Gradle. Un dev client (signé `android/app/debug.keystore`) et
un build EAS ne peuvent pas coexister sous le même nom de paquet : l'installation échoue en
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`, **après cinq minutes de compilation**, avec un message qui ne
nomme ni l'appareil ni le geste correctif. Le preflight le détecte d'abord, nomme l'appareil et
affiche la commande — **sans la jouer** : désinstaller est gratuit sur un émulateur et coûteux sur
le téléphone de Corentin, ce choix lui revient.

Détails d'usage (observer, piloter, deep links, pièges) : skill `trycast-android-emulator`.

---

## Builds et mises à jour à distance

| Commande | Effet |
|---|---|
| `npm run build:dev` | Dev client Android (APK, à installer soi-même) |
| `npm run build:preview` | Build de release sur le projet **dev** — sert aux captures et à valider l'OTA |
| `npm run build:prod` | **AAB** sur le projet **prod**, envoyé à la Play Console (piste `alpha`, en brouillon) |
| `npm run build:prod:ios` | **IPA** sur le projet **prod**, envoyé à TestFlight |
| `npm run build:list` / `build:list:ios` | Les 5 derniers builds Android / iOS |
| `npm run release -- --minor --notes "…"` | Prépare une release : bump, journal, vérifications, commit et tag `vX.Y.Z` |
| `npm run ota:preview -- --message "…"` | Mise à jour à distance sur le canal `preview` |
| `npm run ota:prod -- --message "…"` | Mise à jour à distance sur le canal `production` |
| `npm run ota:list` | Les 5 dernières mises à jour publiées |
| `npm run env:preview` / `env:prod` | Variables EAS de l'environnement, à vérifier avant un build |

Les deux builds de production passent `--auto-submit` : `eas submit` part dès la fin du build,
avec le profil `submit.production` d'`eas.json`. Côté Play, la release arrive **en brouillon** sur
la piste de test fermé (`alpha`) : les notes de version s'écrivent et le déploiement se lance dans
la console. Les clés (compte de service Google, clé d'API App Store Connect) ne vivent que dans
les credentials EAS. Si l'envoi échoue alors que le build a réussi, pas besoin de rebuilder :

```bash
eas submit -p android --profile production --latest
```

### Quand une mise à jour suffit, et quand il faut rebuilder

Un correctif **JavaScript** (texte, style, logique, écran) part par `ota:*` et arrive chez les
testeurs à leur deuxième lancement — pas de relecture Google, pas de téléversement.

Un changement **natif** (lib native ajoutée ou retirée, `app.json`, montée de SDK) impose un
nouveau build. La politique `fingerprint` le dit sans ambiguïté : l'empreinte change, et une
mise à jour publiée depuis ce code serait refusée par les appareils.

### ⚠️ Ce qui déplace la version d'exécution

Une mise à jour n'est délivrée qu'aux builds portant la **même empreinte**. Si elle diffère,
rien ne casse et rien ne s'affiche : la mise à jour n'arrive simplement jamais. On ne le
découvre qu'en constatant que le correctif n'est pas là.

**Vécu le 3 septembre 2026** : ajouter des commandes npm à `package.json` a suffi à changer
l'empreinte et à couper le build déjà distribué de toute mise à jour. Le champ `scripts` est
une source de l'empreinte par défaut — un script `android`/`ios` peut trahir un projet en
workflow natif. Ce n'est pas le cas ici, d'où l'exclusion posée dans `fingerprint.config.js`.

Vérifier avant de publier, en comparant à l'empreinte du build installé (visible sur
`npm run build:list`, ligne *Fingerprint*) :

```bash
npx expo-updates fingerprint:generate --platform android
```

Ce qui déplace légitimement l'empreinte, et impose donc un nouveau build : une dépendance
native ajoutée ou retirée, `app.json`, `eas.json`, les plugins de configuration, les assets
déclarés dans la config, une montée de SDK. Et `fingerprint.config.js` lui-même — à ne
modifier qu'en même temps qu'une release.

**Le `.gitignore` du projet en fait aussi partie** (vérifié le 2026-09-15). C'est pourquoi
`apps/mobile/.gitignore` est versionné : `expo start` le crée tout seul s'il manque, et un fichier
présent en local mais absent sur EAS donnerait deux empreintes pour un même commit. Tant que l'app
occupait la racine, c'était le `.gitignore` du dépôt entier qui était haché : une ligne ajoutée
pour `docs/emails` (commit `c6a1c90`) a très probablement déplacé ainsi l'empreinte de `main`,
sans rien toucher à l'app.
Le `.gitignore` racine n'y entre plus — les règles communes y vont sans risque.

### `release.mjs` : ce qu'il rend indissociable

Une release, c'est six gestes qui doivent tomber ensemble : bumper `app.json` **et**
`package.json` (leur divergence casse `apps/mobile/src/lib/app-version.test.ts`, qui ne faisait jusqu'ici
que la constater), écrire le journal, passer les quatre vérifications de la CI, commiter,
taguer. En faire cinq sur six produit un état qu'on ne découvre qu'au build suivant.

```bash
npm run release -- --minor --notes "…" --dry-run   # lit tout, n'écrit rien
npm run release -- --patch --notes "…"             # bump, journal, commit, tag
```

Sa vraie raison d'être est l'**étape d'empreinte**. La question risquée d'une release n'est pas
MINOR-ou-PATCH, c'est « l'empreinte a-t-elle bougé ? » — jusqu'ici vérifiée de tête contre
`npm run build:list`, alors que le non-appariement est muet. Le script compare l'empreinte locale
à celle du dernier build de production et annonce laquelle des deux sorties s'applique. Elle est
réseau et suppose une session EAS : elle **avertit, elle ne bloque jamais**.

⚠️ **`expo.version` fait partie de l'empreinte** tant que `fingerprint.config.js` n'exclut pas
`ExpoConfigVersions` (vérifié le 2026-09-10 dans `@expo/fingerprint/build/sourcer/Expo.js`, et la
source `expoConfig` hachée contenait bien la version). **Tout bump impose donc un build**, et un
correctif JS se publie sans bump. Ce n'est pas gênant : la version affichée dans Réglages vient
du binaire, qu'une mise à jour à distance ne peut de toute façon pas changer.

Le script **ne pousse rien, ne build rien, ne publie rien** : il affiche les commandes. Échappatoires :
`--skip-checks`, `--skip-fingerprint`, `--dry-run`. Pas de `--allow-dirty`, contrairement à
`ota.mjs` — un commit de release ne doit contenir que le bump et le journal.

Retour arrière tant que rien n'est poussé : `git tag -d vX.Y.Z && git reset --hard HEAD~1`.
Le reste (mise à jour republiée, GitHub Release supprimée) est dans le skill `trycast-release`.

### `ota.mjs` : pourquoi un script et pas une ligne

`eas update` est la seule commande du projet qui change **instantanément** ce que les
utilisateurs exécutent, sans aucun des filets que le passage par le store fournit. Le script
rétablit trois garanties :

- **Arbre de travail propre.** Publier du code non commité rend impossible de savoir plus tard
  ce que les gens faisaient tourner. EAS le signale d'un astérisque après le hash du commit —
  facile à ne pas voir. `--allow-dirty` lève la contrainte, délibérément.
- **Typecheck et tests au vert** avant l'envoi. `--skip-checks` pour un correctif d'urgence.
- **Un message d'au moins 10 caractères.** Il devient l'étiquette de la mise à jour dans le
  tableau de bord : « fix » ne dira rien dans trois semaines.

