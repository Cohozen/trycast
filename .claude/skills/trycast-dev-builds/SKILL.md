---
name: trycast-dev-builds
description: Savoir quand le dev client (émulateur Android + simulateur iOS) doit être rebuildé et comment — déclencheurs natifs (nouvelle lib native, app.json/app.config.ts, montée de SDK), build EAS profil development, alternative locale, pièges (QR qui ouvre le dev client et pas Expo Go, prebuild --clean obligatoire). À consulter dès qu'on installe/retire une dépendance, qu'on touche app.json/app.config.ts, ou qu'un device affiche « Cannot find native module ».
---

# Dev builds TryCast — quand et comment rebuilder

> **Toutes les commandes de ce skill se lancent depuis `apps/mobile`** (le projet Expo), et les chemins relatifs (`android/`, `ios/`, `scripts/…`, `app.json`) s'y rapportent. Seules exceptions : `supabase` et `bash scripts/e2e-*.sh`, à la racine.

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
   - ⚠️ **`npx expo install` réindente `package.json` et `package-lock.json` en 2 espaces** (vécu le 2026-09-24 avec `expo-blur` : un diff de 29 000 lignes pour une dépendance). `npm run format` remet `package.json` d'aplomb, pas le lock, que Biome ne formate pas : le réindenter à 4 espaces (`node -e` avec `JSON.stringify(…, null, 4)` et un saut de ligne final), puis vérifier que `git diff --stat` ne montre plus que les lignes du paquet.
   - ⚠️ **iOS : une lib native peut apporter des « required reason APIs »** que le bloc `ios.privacyManifests` d'`app.json` ne déclare pas encore. Refaire l'agrégation des `PrivacyInfo.xcprivacy` de `node_modules` (recette dans `docs/rgpd/fiches-stores.md`) et compléter le bloc dans le même lot ; sinon Apple le signale à la soumission.
2. **Changement dans `app.json` / `app.config.ts`** — permissions, config plugins, icône/splash, `android.package`/`ios.bundleIdentifier`, `googleServicesFile`, `android.intentFilters` / `ios.associatedDomains`.
   - **Cas vécu le 2026-09-09** (liens d'invitation de ligue) : déclarer les liens d'application est un changement **purement déclaratif** — aucune ligne de JS ne change de comportement — et pourtant le manifeste Android et les entitlements iOS en dépendent, donc rebuild **et** déplacement d'empreinte. C'est le piège de cette famille de changements : rien dans le diff n'a l'air « natif ». Le reste du lot (message de partage, écran d'adhésion, page du site) était livrable en OTA : l'ordre de livraison compte, on livre le JS d'abord et la déclaration avec une release.
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

⚠️ **`npm run ios` exige un certificat de développement Apple sur ce Mac, même pour le
simulateur.** `@expo/cli` impose la signature dès que les entitlements contiennent
`com.apple.developer.associated-domains` ou `…applesignin` (`simulatorBuildRequiresCodeSigning`,
dans `run/ios/codeSigning/simulatorCodeSigning.js`) — c'est le cas depuis les liens d'invitation
(2026-09-09) et Sign in with Apple (2026-09-24). Sans certificat, il s'arrête avant tout build avec un
message qui parle, à tort, d'appareil physique :

```
› Your computer requires some additional setup before you can build onto physical iOS devices.
CommandError: No code signing certificates are available to use.
```

Réparé le 2026-09-24 (Corentin), en deux gestes :
1. **Xcode → Settings → Accounts** → Apple ID du compte développeur → équipe `5P7K97386D` →
   **Manage Certificates** → « + » → **Apple Development**. Le certificat et sa clé privée
   arrivent dans le trousseau (valable un an : **expire en septembre 2027**).
2. Le certificat restait **invalide** : `security find-identity -v -p codesigning` → « 0 valid
   identities found », alors que la même commande **sans `-v`** le listait. Cause : le trousseau
   n'avait que l'ancien intermédiaire WWDR (expiré en 2023), pas **WWDR G3** qui a émis le
   certificat. Correctif : télécharger `https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer`,
   l'ouvrir, l'ajouter au trousseau session. Installer un certificat touche au trousseau : geste
   de Corentin, jamais de l'agent.

Contrôle : `security find-identity -v -p codesigning` doit afficher « 1 valid identities found ».
`npm run ios` affiche alors `Signing and building iOS app with: Apple Development: …` et va au bout.

**Repli sans certificat** (autre Mac, certificat expiré) : Xcode signe en local pour le simulateur,
sans équipe ni entitlements. Compiler directement, installer, puis connecter l'app à Metro :

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo prebuild --clean -p ios
SENTRY_DISABLE_AUTO_UPLOAD=true LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 xcodebuild \
  -workspace ios/TryCast.xcworkspace -scheme TryCast -configuration Debug \
  -destination "id=<UDID du simulateur>" -derivedDataPath ios/build build
xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/TryCast.app
xcrun simctl openurl booted "trycast://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

Metro doit tourner (`npm start`). Le schéma et le workspace s'écrivent **`TryCast`** : `xcodebuild`
sort en erreur 65 sur un nom de schéma inconnu. `SENTRY_DISABLE_AUTO_UPLOAD` se transmet par
l'environnement, pour la même raison que dans `npm run ios`.

⚠️ **Sign in with Apple au simulateur.** Vécu le 2026-09-24 avec le repli `xcodebuild` (sans
entitlements) et sans Apple ID dans les Réglages du simulateur : la feuille s'arrête sur
« Connectez-vous à votre compte Apple », puis renvoie `AuthorizationError 1000`
(`ERR_REQUEST_UNKNOWN`), que l'app affiche en **erreur générique**. C'est voulu : seul le code 1001
(`ERR_REQUEST_CANCELED`) est un renoncement silencieux. Un build signé par `npm run ios` embarque les
entitlements, mais même avec un Apple ID connecté dans le simulateur, la saisie du mot de passe
Apple ID ne mène nulle part (vécu le 2026-09-25, bug connu du simulateur, rien à corriger côté app).
Le parcours complet se vérifie sur iPhone en TestFlight : validé le 2026-09-25 (1.2.0 build 4).
Un build TestFlight vise Supabase **prod** : le fournisseur Apple doit y être activé avant le test.

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

⚠️ **L'oubli est silencieux** quand le code traite l'absence d'une clé comme « fonctionnalité non configurée » — c'est le cas d'Aptabase, de Sentry et de Google (`apps/mobile/src/features/auth/providers.ts` n'affiche pas un bouton dont les identifiants manquent ; Apple n'en a aucun). Pas de crash, pas de log : la fonctionnalité **disparaît de l'app distribuée**. Réflexe : toute nouvelle `EXPO_PUBLIC_*` se pose dans `.env`, dans `.env.example` **et** dans les environnements EAS avant la première distribution.

## Piège : le répertoire de travail du shell (vécu 2026-07-22)

`npx expo run:ios` lancé alors que le shell était resté dans `web/` (aujourd'hui `apps/web/` ; après un `cd web && npm run check` d'une commande précédente) a **traité le site Astro comme un projet Expo** : ajout d'`expo`, `react` et `react-native` à `web/package.json`, création d'un `web/ios/` et d'un `web/app.json`, le tout en violation de la règle « pas de deps Expo dans le site ». Symptôme dans les logs : `Apple bundle identifier: com.cohozen.trycast-web` et `env: export PUBLIC_SUPABASE_KEY` (les variables du site, pas de l'app).

**Toujours vérifier `pwd` avant une commande de build**, ou préfixer par un `cd` absolu. Le répertoire de travail de l'outil Bash persiste d'un appel à l'autre — c'est le même piège que zoxide sur `cd apps/web`, par une autre porte. Depuis la réorganisation du 2026-09-15, le projet Expo est `apps/mobile` : toute commande `expo`, `eas` ou `npm run android|ios|build:*|ota:*` se lance **depuis ce dossier**, jamais depuis la racine ni depuis `apps/web`.

## Piège : l'app de l'émulateur Android n'est pas forcément un dev client (vécu 2026-09-05)

`com.cohozen.trycast` installé sur l'émulateur Pixel 10 Pro était un build **release** (preview/production), pas un dev client. Il se lance normalement, s'utilise normalement — mais il tourne sur **son JS embarqué** et ne se connecte jamais à Metro. **Aucun correctif local n'y est visible** : on n'y observe que le code déjà publié, ce qui se prend très facilement pour « mon correctif ne prend pas ».

**Le signe qui ne trompe pas** : la sortie Metro ne contient **aucun** « Android Bundled » alors que l'app est ouverte (`grep -c "Android Bundled" <log>` = 0).

⚠️ Le « deuxième signe » qu'on lisait ici — *un dev client affiche le launcher « Development Servers » au lancement* — est **peu fiable** : lancé par `npm run android`, le dev client reçoit directement l'URL de Metro en deep link et va droit à l'app, sans passer par le launcher (constaté le 2026-09-05 (bis)). Signes réellement fiables : le **FAB du menu développeur** (engrenage flottant, `content-desc='Tools'` dans `uiautomator dump`) et le **Fast Refresh** qui propage une édition de JSX.

**Résolu le 2026-09-05 (bis)** : `npm run android` construit et installe le dev client en local, et la vérification visuelle Android est opérationnelle (skill `trycast-android-emulator`). Le corollaire vaut désormais **définitivement** pour le téléphone réel : il porte le build du test interne Play **par choix**, et n'accueillera pas de dev client. Ce qu'on y voit est le JS publié, jamais un correctif local — ne pas l'interpréter autrement, et le dire.

## Piège : « mais je passe par Expo Go »

Non. Depuis que le projet a `expo-dev-client`, le QR de `npx expo start` est un deep link `…expo-development-client/…` qui **ouvre le dev build installé, pas Expo Go** — même scanné depuis l'app Expo Go. Un vieil APK reste donc le runtime quoi qu'on scanne. (La touche `s` dans Metro force Expo Go, mais ce n'est plus un chemin supporté pour TryCast : push FCM et config native absents d'Expo Go.)

## Numéro de version (release store)

Tout est passé dans le skill **`trycast-release`** : les deux compteurs, l'arbitrage entre mise à jour à distance et nouveau build, `npm run release` (qui remplace la checklist qui vivait ici), et le piège d'`expo.version` dans l'empreinte. Ce skill-ci ne traite que le dev client.

Le seul point commun à retenir : **ne jamais écrire de `versionCode` / `buildNumber` dans le repo** — EAS les gère (`appVersionSource: "remote"`), en écrire un lui reprendrait la main et ferait diverger le compteur des stores.

## Réflexe de fin de session

Si la session a ajouté un déclencheur de rebuild (liste ci-dessus) : le rappeler dans le message final + l'inscrire dans « Ce qu'il reste à faire » du `DASHBOARD.md`.
