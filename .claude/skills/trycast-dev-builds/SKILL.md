---
name: trycast-dev-builds
description: Savoir quand le dev client (émulateur Android + simulateur iOS) doit être rebuildé et comment — déclencheurs natifs (nouvelle lib native, app.json/app.config.ts, montée de SDK), build EAS profil development, alternative locale, pièges (QR qui ouvre le dev client et pas Expo Go, prebuild --clean obligatoire). À consulter dès qu'on installe/retire une dépendance, qu'on touche app.json/app.config.ts, ou qu'un device affiche « Cannot find native module ».
---

# Dev builds TryCast — quand et comment rebuilder

L'app tourne dans un **dev build** (`expo-dev-client`) sur l'**émulateur Android** et le **simulateur iOS**. Le dev build est une coquille native : le JS est servi par Metro (`npm start`), donc **le quotidien (écrans, hooks, styles, i18n, SQL) ne demande jamais de build**. Seul le natif embarqué dans l'APK/l'app compte.

⚠️ **Le téléphone de Corentin n'est pas une cible de développement** (acté le 2026-09-06, une fois
la chaîne Android locale opérationnelle) : il porte la version du **test interne Play**, et rien
d'autre. Ne pas proposer d'y installer un dev client — les signatures diffèrent, l'installation
supposerait de désinstaller le build du store. Ce qui ne s'observe que sur un appareil physique
(les **notifications push**, absentes du simulateur comme de l'émulateur) se vérifie donc sur ce
build distribué, au besoin après un `npm run ota:prod`.

## Quand un rebuild est nécessaire — LE PRÉVENIR

⚠️ **Dès qu'une de ces situations se présente dans une session, le dire explicitement à Corentin** (« ce changement demandera un rebuild du dev client Android ») et le noter dans le résumé de fin :

1. **Installation/retrait d'une lib contenant du code natif** — en pratique quasi tout package `expo-*` et toute lib `react-native-*` non pure-JS. (Pur JS = pas de rebuild : TanStack Query, i18next, date-fns…)
   - **Exception vérifiée** : un module natif déjà présent en **dépendance transitive** est déjà autolinké, donc déjà dans le binaire — l'expliciter dans `package.json` ne demande **aucun rebuild**. Vécu le 2026-07-21 avec `expo-application` (tiré par `expo-notifications`) : `npx expo install expo-application` puis lecture de `nativeApplicationVersion` a fonctionné du premier coup sur le dev build existant. Vérifier avant de conclure : `npx expo-modules-autolinking search | grep <module>` — s'il y apparaît, c'est déjà lié.
2. **Changement dans `app.json` / `app.config.ts`** — permissions, config plugins, icône/splash, `android.package`/`ios.bundleIdentifier`, `googleServicesFile`.
3. **Montée de version du SDK Expo** (ou de React Native).

Symptôme d'un build en retard : `ERROR [Error: Cannot find native module 'ExpoXxx']` au lancement sur le device — souvent accompagné d'un faux WARN « Route … is missing the required default export » (l'import natif qui jette empêche l'évaluation du module de la route ; il disparaît avec le rebuild).

## Rebuild ou mise à jour à distance ? (Lot 9)

Depuis qu'`expo-updates` est en place, un correctif **JavaScript** n'a plus besoin de build :

```bash
npm run ota:preview -- --message "…"   # canal preview  → build preview
npm run ota:prod    -- --message "…"   # canal production → testeurs Play
```

Le build reste obligatoire pour tout ce qui touche au natif — la liste ci-dessus vaut mot pour
mot, plus `eas.json`, les assets déclarés dans la config et `fingerprint.config.js`.

### ⚠️ Le non-appariement d'empreinte est MUET

La politique est `fingerprint` : une mise à jour n'est délivrée qu'aux builds portant
**exactement** la même version d'exécution. Si elle diffère, **rien n'échoue et rien ne
s'affiche** — le correctif n'arrive jamais, et on ne le découvre qu'en s'étonnant que rien ne
bouge. C'est le mode de panne le plus coûteux du dispositif.

Avant toute publication, comparer à l'empreinte du build installé (`npm run build:list`, ligne
*Fingerprint*) :

```bash
npx expo-updates fingerprint:generate --platform android
```

**Vécu le 2026-09-03** : ajouter des commandes npm à `package.json` a suffi à déplacer
l'empreinte et à couper le build déjà distribué de toute mise à jour. Le champ `scripts` est
une source de l'empreinte par défaut — un script `android`/`ios` pouvant trahir un projet en
workflow natif. D'où l'exclusion posée dans `fingerprint.config.js`, vérifiée : ajouter un
script npm ne déplace plus rien. **Modifier ce fichier déplace l'empreinte** : ne le faire
qu'en même temps qu'une release.

### ⚠️ Un build Android local pollue l'empreinte (`node_modules` réécrit)

**Vécu le 2026-09-06** : `npm run build:prod` s'arrête au bout de 48 s sur

```
Runtime version mismatch:
- Runtime version calculated on local machine: 51df254f…
- Runtime version calculated on EAS: 6d6e1903…
```

avec un diff d'empreinte portant sur un seul dossier,
`node_modules/@react-native-masked-view/masked-view` (raison `rncoreAutolinkingAndroid`).

Cause : le `android/build.gradle` **de cette bibliothèque** réécrit son propre
`AndroidManifest.xml` **dans `node_modules`**, à la configuration du projet, pour en retirer
l'attribut `package=` (interdit depuis AGP 7) :

```groovy
def manifestOutFile = file("${projectDir}/src/main/AndroidManifest.xml")
…
manifestOutFile.write(manifestContent)   // écriture en dur dans node_modules
```

Un seul `npm run android` suffit donc à faire diverger la machine d'une installation fraîche,
**définitivement** : EAS calcule l'empreinte **avant** Gradle (paquet publié intact), la machine
locale **après** (fichier réécrit). Le dossier étant haché pour les deux plateformes
(`rncoreAutolinkingAndroid` **et** `rncoreAutolinkingIos`), l'empreinte iOS est touchée aussi.

Le build n'était pas en cause : c'est l'empreinte **locale** qui mentait. Le vrai danger est
l'OTA — une publication dans cet état part avec une empreinte que plus aucun build ne porte,
donc dans le vide et sans le moindre message.

**Traité à la racine** : `fingerprint.config.js` ignore ce manifeste (`ignorePaths`), vérifié —
l'empreinte est la même que le fichier soit intact ou réécrit par Gradle. Si le symptôme
réapparaît pour **une autre** bibliothèque (même famille de `build.gradle` bavard), le réflexe
est de comparer le paquet local au paquet publié plutôt que de soupçonner EAS :

```bash
npm pack @scope/paquet@<version>   # dans un dossier temporaire, puis
tar xzf *.tgz && diff -r package <projet>/node_modules/@scope/paquet
```

et de remettre l'arbre d'aplomb avec `npm ci` avant tout build EAS ou publication OTA.

### Les `EXPO_PUBLIC_*` d'un build de release

Un build `preview`/`production` **inline les variables au bundling sur les serveurs EAS**,
depuis l'environnement EAS et non le `.env` local. Une variable absente ne fait **pas** échouer
le build : elle disparaît en silence. `npm run env:prod` avant de lancer.

## Comment rebuilder

### Android (device perso de Corentin) — voie validée : EAS

```bash
eas build -p android --profile development
```

- Profil `development` d'`eas.json` déjà configuré (`developmentClient: true`, `GOOGLE_SERVICES_JSON` en env EAS, clé FCM aux credentials).
- Fin de build : Corentin installe l'APK via le lien/QR EAS, puis `npm start` et il rouvre l'app.
- **Quota free : 30 builds/mois** — au rythme réel (~1–2 rebuilds/mois) c'est large ; ne pas lancer de build EAS « pour voir ».
- **Alternative sans quota, opérationnelle depuis le 2026-09-05** : `npm run android` (build local, 5 min 30 de Gradle). Elle couvre l'**émulateur**, seule cible de développement Android depuis le 2026-09-06 (le téléphone reste sur le build du test interne, cf. plus haut). Prérequis et pilotage : skill `trycast-android-emulator`.

### Android (émulateur) — build local

```bash
npx expo prebuild --clean -p android && npm run android
```

Même règle du `--clean` qu'en iOS. Vérifier après coup que `android/app/google-services.json` est bien revenu (réinjecté par `app.config.ts`). Prérequis machine : un **JDK 17** (`brew install openjdk@17`). Démarrer l'émulateur d'abord avec `npm run android:emulator`, qui attend que le système soit réellement prêt.

### iOS (simulateur) — build local

```bash
npx expo prebuild --clean -p ios && npm run ios
```

⚠️ Le `--clean` est **obligatoire** : un `expo run:ios` sur un `ios/` préexistant ne ré-applique pas les config plugins (vécu : `NSPhotoLibraryUsageDescription` manquant → crash TCC au picker photo).

⚠️ **`pod install` refuse les pods Swift dont les dépendances ne définissent pas de module** (vécu 2026-07-23, ajout de `@react-native-google-signin/google-signin`). Message : *« The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and `RecaptchaInterop`, which do not define modules »* — le prebuild s'arrête net à l'étape CocoaPods. Correctif **dans `app.json`**, jamais dans le `Podfile` (généré, effacé par `--clean`) : plugin `expo-build-properties` avec les pods fautifs en `modular_headers`.

```json
["expo-build-properties", { "ios": { "extraPods": [
    { "name": "GoogleUtilities", "modular_headers": true },
    { "name": "RecaptchaInterop", "modular_headers": true }
] } }]
```

Toute future dépendance de l'écosystème Google/Firebase côté iOS peut rallonger cette liste : lire le nom des pods cités dans le message d'erreur et les y ajouter. **Android n'est pas concerné.**

⚠️ **`pod install` échoue en `Encoding::CompatibilityError` tant que la locale du shell n'est pas UTF-8** (vécu 2026-07-23, ajout de `react-native-keyboard-controller`). Message : *« Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError) »* au tout début de l'étape CocoaPods du `prebuild --clean`. Cause : le shell non-interactif de l'agent tourne avec `LANG` vide / `LC_CTYPE=C`, et CocoaPods normalise le chemin d'installation. Correctif : préfixer les commandes de build par la locale UTF-8. Le `prebuild` régénère quand même `ios/`, seul `pod install` plante — on peut donc relancer les pods seuls puis le build.

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo prebuild --clean -p ios
# ou, si prebuild a déjà généré ios/ et n'a planté qu'aux pods :
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install && cd ..
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npm run ios
```

⚠️ **Toujours lancer via `npm run ios` / `npm run android`, jamais `npx expo run:*` à la main** (vécu 2026-07-22, Lot B) : depuis l'ajout de Sentry, ces scripts portent `SENTRY_DISABLE_AUTO_UPLOAD=true`. Sans ce drapeau, la phase de build `sentry-cli` tente d'envoyer les source maps, ne trouve ni organisation ni jeton, et **fait échouer tout le build en erreur 65** (`An organization ID or slug is required`). Le mettre dans `.env` **ne marche pas** : Expo ne transmet que les variables `EXPO_PUBLIC_*` à la phase Xcode. `ios/.xcode.env.local` marcherait aussi mais est effacé par `prebuild --clean`. Côté EAS, le drapeau est dans les profils `development` et `preview` d'`eas.json`. Il sautera le jour où les source maps de release seront branchées (organisation + projet dans le plugin `app.json` + `SENTRY_AUTH_TOKEN` en secret EAS).

## Piège : les `EXPO_PUBLIC_*` ne suivent pas le même chemin selon le profil

Un build **`development`** n'embarque pas de bundle JS : il le télécharge depuis **Metro**, qui lit le **`.env` local**. Une variable ajoutée à `.env` est donc active sans rebuild, et un dev build « marche » alors même que la variable n'existe nulle part côté EAS.

Un build **`preview`/`production`** bundle **sur les serveurs EAS** : les `EXPO_PUBLIC_*` y sont **inlinées à ce moment-là**, depuis l'**environnement EAS** (`eas env:create`, ou le dashboard Expo), jamais depuis le `.env` de la machine — il n'est pas envoyé.

⚠️ **L'oubli est silencieux** quand le code traite l'absence d'une clé comme « fonctionnalité non configurée » — c'est le cas d'Aptabase, de Sentry et des fournisseurs d'identité (`src/features/auth/providers.ts` n'affiche pas un bouton dont les identifiants manquent). Pas de crash, pas de log : la fonctionnalité **disparaît de l'app distribuée**. Réflexe : toute nouvelle `EXPO_PUBLIC_*` se pose dans `.env`, dans `.env.example` **et** dans les environnements EAS avant la première distribution.

## Piège : le répertoire de travail du shell (vécu 2026-07-22)

`npx expo run:ios` lancé alors que le shell était resté dans `web/` (après un `cd web && npm run check` d'une commande précédente) a **traité le site Astro comme un projet Expo** : ajout d'`expo`, `react` et `react-native` à `web/package.json`, création d'un `web/ios/` et d'un `web/app.json`, le tout en violation de la règle « pas de deps Expo dans le site ». Symptôme dans les logs : `Apple bundle identifier: com.cohozen.trycast-web` et `env: export PUBLIC_SUPABASE_KEY` (les variables du site, pas de l'app).

**Toujours vérifier `pwd` avant une commande de build**, ou préfixer par un `cd` absolu. Le répertoire de travail de l'outil Bash persiste d'un appel à l'autre — c'est le même piège que zoxide sur `cd web`, par une autre porte.

## Piège : l'app de l'émulateur Android n'est pas forcément un dev client (vécu 2026-09-05)

`com.cohozen.trycast` installé sur l'émulateur Pixel 10 Pro était un build **release** (preview/production), pas un dev client. Il se lance normalement, s'utilise normalement — mais il tourne sur **son JS embarqué** et ne se connecte jamais à Metro. **Aucun correctif local n'y est visible** : on n'y observe que le code déjà publié, ce qui se prend très facilement pour « mon correctif ne prend pas ».

**Le signe qui ne trompe pas** : la sortie Metro ne contient **aucun** « Android Bundled » alors que l'app est ouverte (`grep -c "Android Bundled" <log>` = 0).

⚠️ Le « deuxième signe » qu'on lisait ici — *un dev client affiche le launcher « Development Servers » au lancement* — est **peu fiable** : lancé par `npm run android`, le dev client reçoit directement l'URL de Metro en deep link et va droit à l'app, sans passer par le launcher (constaté le 2026-09-05 (bis)). Signes réellement fiables : le **FAB du menu développeur** (engrenage flottant, `content-desc='Tools'` dans `uiautomator dump`) et le **Fast Refresh** qui propage une édition de JSX.

**Résolu le 2026-09-05 (bis)** : `npm run android` construit et installe le dev client en local, et la vérification visuelle Android est opérationnelle (skill `trycast-android-emulator`). Le corollaire vaut désormais **définitivement** pour le téléphone réel : il porte le build du test interne Play **par choix**, et n'accueillera pas de dev client. Ce qu'on y voit est le JS publié, jamais un correctif local — ne pas l'interpréter autrement, et le dire.

## Piège : « mais je passe par Expo Go »

Non. Depuis que le projet a `expo-dev-client`, le QR de `npx expo start` est un deep link `…expo-development-client/…` qui **ouvre le dev build installé, pas Expo Go** — même scanné depuis l'app Expo Go. Un vieil APK reste donc le runtime quoi qu'on scanne. (La touche `s` dans Metro force Expo Go, mais ce n'est plus un chemin supporté pour TryCast : push FCM et config native absents d'Expo Go.)

## Numéro de version (release store)

- `app.json` → `expo.version` = **version marketing, seule source de vérité**, bumpée **à la main uniquement quand on prépare une release store** (MINOR = fonctionnalités, PATCH = correctifs). Pas de bump « par lot livré ». Aujourd'hui : `1.0.0`, rien n'étant encore publié — la beta TestFlight / Play interne se joue en 1.0.0 avec des builds 1, 2, 3…
- **Ne jamais écrire de `versionCode` / `buildNumber` dans le repo** : `eas.json` est en `appVersionSource: "remote"` + `autoIncrement` (profil production), c'est EAS qui les incrémente. En écrire un dans `app.json` reprendrait la main à EAS et ferait diverger le compteur des stores.
- `package.json` → `version` doit rester **identique** à `app.json` (garde-fou : `src/lib/app-version.test.ts`, la CI casse sinon). Bumper les deux dans le même commit.
- Checklist avant un `eas build --profile production` : version bumpée dans les deux fichiers + `npm run typecheck && npm run lint && npm run format:check && npm run test` vert + `DASHBOARD.md` à jour.
- L'écran Réglages lit `nativeApplicationVersion` / `nativeBuildVersion` d'`expo-application` (binaire installé), et non `Constants.expoConfig.version` (bundle JS) — c'est ce qui permet de comparer d'un coup d'œil avec ce que montre le store.

## Réflexe de fin de session

Si la session a ajouté un déclencheur de rebuild (liste ci-dessus) : le rappeler dans le message final + l'inscrire dans les « actions Corentin en attente » du `DASHBOARD.md`.
