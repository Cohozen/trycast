---
name: trycast-dev-builds
description: Savoir quand le dev client (Android device + simulateur iOS) doit être rebuildé et comment — déclencheurs natifs (nouvelle lib native, app.json/app.config.ts, montée de SDK), build EAS profil development, alternative locale, pièges (QR qui ouvre le dev client et pas Expo Go, prebuild --clean obligatoire). À consulter dès qu'on installe/retire une dépendance, qu'on touche app.json/app.config.ts, ou qu'un device affiche « Cannot find native module ».
---

# Dev builds TryCast — quand et comment rebuilder

L'app tourne dans un **dev build** (`expo-dev-client`) sur le téléphone Android de Corentin et le simulateur iOS. Le dev build est une coquille native : le JS est servi par Metro (`npm start`), donc **le quotidien (écrans, hooks, styles, i18n, SQL) ne demande jamais de build**. Seul le natif embarqué dans l'APK/l'app compte.

## Quand un rebuild est nécessaire — LE PRÉVENIR

⚠️ **Dès qu'une de ces situations se présente dans une session, le dire explicitement à Corentin** (« ce changement demandera un rebuild du dev client Android ») et le noter dans le résumé de fin :

1. **Installation/retrait d'une lib contenant du code natif** — en pratique quasi tout package `expo-*` et toute lib `react-native-*` non pure-JS. (Pur JS = pas de rebuild : TanStack Query, i18next, date-fns…)
   - **Exception vérifiée** : un module natif déjà présent en **dépendance transitive** est déjà autolinké, donc déjà dans le binaire — l'expliciter dans `package.json` ne demande **aucun rebuild**. Vécu le 2026-07-21 avec `expo-application` (tiré par `expo-notifications`) : `npx expo install expo-application` puis lecture de `nativeApplicationVersion` a fonctionné du premier coup sur le dev build existant. Vérifier avant de conclure : `npx expo-modules-autolinking search | grep <module>` — s'il y apparaît, c'est déjà lié.
2. **Changement dans `app.json` / `app.config.ts`** — permissions, config plugins, icône/splash, `android.package`/`ios.bundleIdentifier`, `googleServicesFile`.
3. **Montée de version du SDK Expo** (ou de React Native).

Symptôme d'un build en retard : `ERROR [Error: Cannot find native module 'ExpoXxx']` au lancement sur le device — souvent accompagné d'un faux WARN « Route … is missing the required default export » (l'import natif qui jette empêche l'évaluation du module de la route ; il disparaît avec le rebuild).

## Comment rebuilder

### Android (device perso de Corentin) — voie validée : EAS

```bash
eas build -p android --profile development
```

- Profil `development` d'`eas.json` déjà configuré (`developmentClient: true`, `GOOGLE_SERVICES_JSON` en env EAS, clé FCM aux credentials).
- Fin de build : Corentin installe l'APK via le lien/QR EAS, puis `npm start` et il rouvre l'app.
- **Quota free : 30 builds/mois** — au rythme réel (~1–2 rebuilds/mois) c'est large ; ne pas lancer de build EAS « pour voir ».
- Alternative sans quota : `npm run android` (`expo run:android`, build local + install USB) — **pas disponible aujourd'hui** : pas de SDK Android ni de JDK sur le Mac (vérifié 2026-07-14, ~1 Go d'Android Studio à installer). À envisager au Lot 7.

### iOS (simulateur) — build local

```bash
npx expo prebuild --clean -p ios && npm run ios
```

⚠️ Le `--clean` est **obligatoire** : un `expo run:ios` sur un `ios/` préexistant ne ré-applique pas les config plugins (vécu : `NSPhotoLibraryUsageDescription` manquant → crash TCC au picker photo). Même logique côté Android local le jour venu.

⚠️ **`pod install` refuse les pods Swift dont les dépendances ne définissent pas de module** (vécu 2026-07-23, ajout de `@react-native-google-signin/google-signin`). Message : *« The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and `RecaptchaInterop`, which do not define modules »* — le prebuild s'arrête net à l'étape CocoaPods. Correctif **dans `app.json`**, jamais dans le `Podfile` (généré, effacé par `--clean`) : plugin `expo-build-properties` avec les pods fautifs en `modular_headers`.

```json
["expo-build-properties", { "ios": { "extraPods": [
    { "name": "GoogleUtilities", "modular_headers": true },
    { "name": "RecaptchaInterop", "modular_headers": true }
] } }]
```

Toute future dépendance de l'écosystème Google/Firebase côté iOS peut rallonger cette liste : lire le nom des pods cités dans le message d'erreur et les y ajouter. **Android n'est pas concerné.**

⚠️ **Toujours lancer via `npm run ios` / `npm run android`, jamais `npx expo run:*` à la main** (vécu 2026-07-22, Lot B) : depuis l'ajout de Sentry, ces scripts portent `SENTRY_DISABLE_AUTO_UPLOAD=true`. Sans ce drapeau, la phase de build `sentry-cli` tente d'envoyer les source maps, ne trouve ni organisation ni jeton, et **fait échouer tout le build en erreur 65** (`An organization ID or slug is required`). Le mettre dans `.env` **ne marche pas** : Expo ne transmet que les variables `EXPO_PUBLIC_*` à la phase Xcode. `ios/.xcode.env.local` marcherait aussi mais est effacé par `prebuild --clean`. Côté EAS, le drapeau est dans les profils `development` et `preview` d'`eas.json`. Il sautera le jour où les source maps de release seront branchées (organisation + projet dans le plugin `app.json` + `SENTRY_AUTH_TOKEN` en secret EAS).

## Piège : le répertoire de travail du shell (vécu 2026-07-22)

`npx expo run:ios` lancé alors que le shell était resté dans `web/` (après un `cd web && npm run check` d'une commande précédente) a **traité le site Astro comme un projet Expo** : ajout d'`expo`, `react` et `react-native` à `web/package.json`, création d'un `web/ios/` et d'un `web/app.json`, le tout en violation de la règle « pas de deps Expo dans le site ». Symptôme dans les logs : `Apple bundle identifier: com.cohozen.trycast-web` et `env: export PUBLIC_SUPABASE_KEY` (les variables du site, pas de l'app).

**Toujours vérifier `pwd` avant une commande de build**, ou préfixer par un `cd` absolu. Le répertoire de travail de l'outil Bash persiste d'un appel à l'autre — c'est le même piège que zoxide sur `cd web`, par une autre porte.

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
