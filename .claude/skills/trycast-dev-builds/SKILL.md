---
name: trycast-dev-builds
description: Savoir quand le dev client (Android device + simulateur iOS) doit être rebuildé et comment — déclencheurs natifs (nouvelle lib native, app.json/app.config.ts, montée de SDK), build EAS profil development, alternative locale, pièges (QR qui ouvre le dev client et pas Expo Go, prebuild --clean obligatoire). À consulter dès qu'on installe/retire une dépendance, qu'on touche app.json/app.config.ts, ou qu'un device affiche « Cannot find native module ».
---

# Dev builds TryCast — quand et comment rebuilder

L'app tourne dans un **dev build** (`expo-dev-client`) sur le téléphone Android de Corentin et le simulateur iOS. Le dev build est une coquille native : le JS est servi par Metro (`npm start`), donc **le quotidien (écrans, hooks, styles, i18n, SQL) ne demande jamais de build**. Seul le natif embarqué dans l'APK/l'app compte.

## Quand un rebuild est nécessaire — LE PRÉVENIR

⚠️ **Dès qu'une de ces situations se présente dans une session, le dire explicitement à Corentin** (« ce changement demandera un rebuild du dev client Android ») et le noter dans le résumé de fin :

1. **Installation/retrait d'une lib contenant du code natif** — en pratique quasi tout package `expo-*` et toute lib `react-native-*` non pure-JS. (Pur JS = pas de rebuild : TanStack Query, i18next, date-fns…)
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
