# TryCast — instructions agents

App mobile de pronostics rugby (Expo + Supabase), projet portfolio solo de Corentin. Voir `README.md` pour le setup complet.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Organisation du dépôt

Deux apps et un backend commun, **sans workspaces npm** (un `package.json` et un lock par dossier, trois `npm ci`) :

- `apps/mobile/` — l'app Expo : `app.json`, `app.config.ts`, `eas.json`, `fingerprint.config.js`, `CHANGELOG.md`, `src/`, `assets/`, ses scripts (`release`, `ota`, `android-*`), son `.env` et `google-services.json` (non versionnés). **`eas`, `expo` et `npm run android|ios|start|build:*|ota:*|env:*|release|typecheck|lint|test|verify` se lancent depuis `apps/mobile`**
- `apps/web/` — le site Astro (voir « Site web »)
- `supabase/` — **à la racine, pas dans `apps/`** : c'est le backend des deux apps, et la CLI `supabase` cherche ce dossier dans le répertoire courant (le déplacer imposerait `--workdir` partout). `supabase`, `bash scripts/e2e-*.sh` et les seeds se lancent **depuis la racine**
- `scripts/` (racine) — outillage commun : `typegen`, `emails:*`, `deps:check`, E2E, seeds. Ils lisent le `.env` de `apps/mobile` (`scripts/project-ref.mjs`), seule source du projet Supabase visé
- `package.json` racine — outillage seul (Biome, Vitest) : `npm run format`, `npm test` (tests des Edge Functions), `npm run verify` (tout, app comprise)

⚠️ Couplages de la disposition, à ne pas défaire :
- **Le barème est partagé** : `apps/mobile/src/features/scoring/*.ts` réexporte `supabase/functions/_shared/scoring/`, hors du projet Expo. `apps/mobile/metro.config.js` ajoute ce dossier aux `watchFolders` ; sans cela, Metro refuse le fichier
- **`apps/mobile/.gitignore` est versionné exprès** : `@expo/fingerprint` hache le `.gitignore` du projet et `expo start` le recrée s'il manque. Absent du dépôt, l'empreinte locale et celle d'EAS divergeraient pour le même commit. Les règles communes vont dans le `.gitignore` racine, qui n'entre pas dans l'empreinte
- **Jamais de `tsconfig.json` à la racine ni dans `apps/`** : la découverte tsconfig de rolldown remonte au-dessus du site et casserait son build (piège détaillé dans le skill `trycast-site-web`)

## Stack (versions figées, ne pas downgrader)

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript ~6.0, Expo Router (typed routes + react compiler activés)
- NativeWind v5 preview + Tailwind CSS v4 (styling via `className`, helpers dans `apps/mobile/src/tw/`)
- Supabase JS v2 typé (`Database` de `apps/mobile/src/lib/database.types.ts` — fichier généré, ne jamais l'éditer à la main : `npm run typegen`)
- TanStack Query v5, Vitest v4

## Commandes de vérification

Avant de considérer un lot terminé : `npm run verify` **à la racine** — formatage de tout le dépôt, tests des Edge Functions, puis typecheck, lint (`--max-warnings 0`) et tests de l'app. La CI GitHub Actions exécute la même chose. Le site a sa vérification propre (voir « Site web »).

**Veille des dépendances** — `npm run deps:check` (hors lot obligatoire) range ce qui est en retard par famille et ne modifie rien ; un workflow hebdomadaire verse le même rapport dans une issue unique. ⚠️ `latest` est un piège pour tout ce que le **SDK pilote** (async-storage, Sentry, react-native, react…) : ces versions montent en bloc avec le SDK, jamais par un `npm i` isolé, et **toute montée d'un paquet natif déplace l'empreinte** — donc coupe les builds distribués de l'OTA, à caler sur une release. Une majeure qu'on ne prend pas se justifie dans `docs/dependances.md` ; recette et pièges dans `scripts/README.md`.

## Conventions

- Alias d'import `@/` → `apps/mobile/src/`
- Écrans dans `apps/mobile/src/app/` (groupes `(auth)` et `(app)`), logique métier par domaine dans `apps/mobile/src/features/<domaine>/` avec tests `*.test.ts` colocalisés
- **i18n : FR = langue source, jamais de chaîne UI en dur.** Toute chaîne visible passe par i18next : ressources dans `apps/mobile/src/locales/fr/<namespace>.json` (un namespace par domaine, calqué sur `apps/mobile/src/features/` + `common`), clés typées (une clé manquante casse `tsc`). Les fonctions de domaine (`errors.ts`, `validation.ts`) retournent des **clés i18n**, la traduction se fait dans l'écran via `t()` avec `useTranslation(['<ns>', 'common'])`. Dates/nombres via `Intl` avec `i18n.language`
- Logique de scoring : module TS pur testable unitairement + écriture atomique via une seule RPC SQL (décision actée, ne pas re-débattre)
- **Joker par phase (×2, v1.1.0)** : un match doublé par **phase de compétition**, et une phase est une **fenêtre de dates** (`competition_phases`, seedée dans `scripts/seed-competitions.sql`), **pas** `matches.round` — le `week` brut de Highlightly ne dit rien des phases finales. Une compétition sans phase n'a pas de joker (bouton masqué). Un par phase partout, garanti par la PK `(user_id, phase_id)` de `phase_jokers` ; écritures **uniquement** par les RPC `set_phase_joker` / `clear_phase_joker` (deadline au kickoff, prono requis, joker **consommé** dès que son match a commencé). Scoring : plancher à 0 **puis** ×2 (`JOKER_MULTIPLIER`, constante et non clé du barème), `jokerMultiplier` dans le breakdown. Identité visuelle : **vert marque**, jamais grenat. Domaine app : `apps/mobile/src/features/jokers/` (« phase de compétition » ; `MatchPhase` désigne autre chose). ⚠️ Une nouvelle compétition doit recevoir ses phases **avant** son premier match, sinon le joker n'y existe pas
- **Un composant par fichier, un fichier par composant** (fichier nommé comme le composant, en kebab-case)
- Tout composant réutilisable va dans `apps/mobile/src/components/` (primitives UI dans `apps/mobile/src/components/ui/`) ; un composant propre à un domaine reste dans `apps/mobile/src/features/<domaine>/components/`
- Types partagés dans des fichiers dédiés : `apps/mobile/src/features/<domaine>/types.ts` par domaine (pas de fourre-tout global) ; les props d'un composant restent colocalisées avec lui tant qu'elles ne sont pas réutilisées ailleurs
- **Design system (Lot 5.5)** : tokens dans `apps/mobile/src/global.css` (`@theme` Tailwind v4 — couleurs sémantiques `bg-bg`/`bg-surface`/`text-text`/`text-text-muted`/`bg-accent`…, light + dark via `light-dark()`, typo Anton/Inter, radius, ombres `tc-shadow-*`). Référence complète : `docs/design/` (livrable Claude Design) et le skill `trycast-design-system`. Le grenat (`accent`) est une étincelle, jamais un fond ; surfaces neutres chaudes (v2) : light = base sable/blanc, dark = base charbon chaud ; le vert est la marque (`brand`), pas un fond. Les primitives v2 (`sand-*`, `char-*`, `paper-*`, `ink-*`, `green-*`, `grenat-*`) ne servent qu'aux couleurs qui doivent rester **figées quel que soit le thème** ; `cream-*`/`mist-300` sont la rampe v1 **legacy** (marque et drapeaux uniquement)
- Styles : classes NativeWind inline dans le JSX (`className`) via les **tokens du DS** (jamais de couleur Tailwind brute type `bg-blue-600`, ni de hex en dur hors cas documenté) ; dès qu'un style se répète, extraire une primitive `apps/mobile/src/components/ui/` ou un variant ; composition conditionnelle via `cn()` de `apps/mobile/src/tw/variants.ts` — pas de `StyleSheet.create` sauf impossibilité Tailwind. Polices : `font-display` (Anton) pour titres/scores, `font-body[-medium|-semibold|-bold]` (Inter) pour le reste — en natif, `font-semibold` seul ne change pas la graisse d'une police custom
- Marges d'écran : jamais de padding haut/bas d'écran en dur (`pt-14`, `pb-32`) — `useScreenInsets()` de `@/tw/use-screen-insets` (safe areas avec planchers DS), valeurs passées en `style`/`contentContainerStyle` (détails et piège react-native-css dans le skill `trycast-design-system`)
- Composant pressable qui toggle des classes à variables CSS au press (`scale-*`, `shadow-*`) : classe `will-change-variable` dans les classes de base du `Pressable`, sinon react-native-css remonte le composant au premier press (détails dans le skill `trycast-design-system`)
- **Guide d'accueil** (`apps/mobile/src/features/welcome/`) : quatre volets dans une bottom sheet paginée, ouverts une fois au premier lancement et rejouables depuis Réglages → À propos. L'état « déjà vu » est une **préférence locale** (`trycast.welcome-guide-seen`), pas une colonne serveur : c'est cosmétique, et une réinstallation le rejoue — assumé. ⚠️ **Ce flag pilote aussi la première demande de permission notifications** : `useRegisterPushToken` la suspend tant que le guide n'a pas été vu, et c'est la fermeture du guide qui relaie l'appel — sinon le dialogue système surgit à froid par-dessus la sheet de bienvenue. Ne pas rétablir l'appel direct au montage
- **Signaler un problème** (`apps/mobile/src/features/feedback/`) : icône à gauche de la cloche dans les onglets (`HeaderActions`) et ligne dans Réglages → À propos, une sheet commune via `FeedbackProvider`. Envoi par `Sentry.captureFeedback` ; l'e-mail et le pseudo n'y sont joints que si la case est cochée, **jamais par `Sentry.setUser`** (les plantages restent anonymes). Contexte d'écran en **liste blanche** : le code d'invitation ne part jamais. Détails dans le skill `trycast-telemetry`

## Site web (`apps/web/`)

- Site vitrine **Astro statique** (landing + waitlist + pages légales), sous-dossier autonome avec son propre `package.json` — **pas de workspaces npm**, ne pas mélanger avec les deps d'`apps/mobile`
- **Bilingue FR/EN** : français à la racine (langue source, URL inchangées), anglais sous `/en/` (i18n d'Astro, `prefixDefaultLocale: false`). Aucune chaîne en dur : dictionnaires `apps/web/src/i18n/fr.ts` / `en.ts`, le second typé sur le premier (une clé manquante casse `astro check`). Slugs par langue dans la table `routes` de `apps/web/src/i18n/index.ts`, seule source du sélecteur et des `hreflang`. **Pas de redirection automatique** selon le navigateur (acté le 2026-09-11) : sélecteur dans la nav. Les pages d'atterrissage à URL imposée (`/rejoindre/<code>`, `/app/confirme`, `/app/email-modifie`) rendent les deux langues et choisissent côté client (`autoLocale` du layout, `?lang=` pour forcer)
- **Pages légales : le français seul fait foi.** Chacune a sa traduction sous `/en/` (`cgu` ↔ `en/terms`, `confidentialite` ↔ `en/privacy`, `mentions-legales` ↔ `en/legal-notice`, `suppression-compte` ↔ `en/delete-account`) : **modifier l'une, c'est modifier l'autre dans le même commit** et avancer `legalUpdatedAt`. `npm run check` compare leur structure (`apps/web/scripts/check-legal-parity.mjs`). L'app ouvre la version de sa langue via `legalUrl()` de `apps/mobile/src/lib/urls.ts`, qui **réplique** les slugs légaux de la table `routes` : `apps/mobile/src/lib/urls.test.ts` casse si elles divergent, et la CI de l'app se déclenche pour cela sur `apps/web/src/i18n/index.ts` (seul fichier de `apps/web/` qu'elle surveille)
- Styles : CSS scopé Astro avec les tokens DS copiés dans `apps/web/src/styles/tokens.css` (custom properties `--bg`/`--surface`/`--accent`…, dark via `[data-theme='dark']`) ; polices Anton/Inter self-hostées via `@fontsource` (pas de CDN Google Fonts) ; mêmes règles DS que l'app (grenat = étincelle, jamais un fond)
- Vérification : `cd apps/web && npm run check && npm run build` — CI dédiée `.github/workflows/web.yml` (la CI app ignore `apps/web/**`)
- Preview navigateur : config `site-web` de `.claude/launch.json` (port 4321) ; piège : après un scroll, la capture d'écran du panneau navigateur rend une page vide — translater `document.body` en JS au lieu de scroller
- Formulaire waitlist : RPC `join_waitlist` (migration `20260715000100_waitlist.sql`) appelée en fetch direct PostgREST, env `apps/web/.env` (`PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_KEY`, modèle `apps/web/.env.example`) ; anti-spam côté SQL (rate limit IP 3/h + plafond global 100/h + refus silencieux) + honeypot côté client — pas d'accès direct aux tables `waitlist_*`
- Hébergement : **Vercel** (Root Directory `apps/web`, build sur push GitHub, installation par défaut) ; le connecteur Vercel de Claude ne voit pas le projet (scope), passer par git push

## Liens d'invitation de ligue

- Forme unique : `https://www.trycast.fr/rejoindre/<CODE>`, construite par `buildInviteUrl()` de
  `apps/mobile/src/lib/urls.ts` — **seul endroit** qui connaît cette URL côté app. Elle est répliquée à trois
  autres : le `rewrite` de `apps/web/vercel.json` (le site est statique, donc pas de `getStaticPaths`
  sur un code arbitraire : une page unique `apps/web/src/pages/rejoindre.astro` sert `/rejoindre/:code`
  et lit le code côté client), le `pathPrefix` des `intentFilters` d'`app.json`, et
  `INVITE_PATH_SEGMENT` de `apps/mobile/src/features/leagues/invite-link.ts`. En changer une impose les quatre
- **L'hôte est `www.trycast.fr`**, domaine primaire ; l'apex y redirige et n'est **pas** déclaré
  côté natif : ni Apple ni Google ne suivent une redirection pour lire `.well-known/`, et les liens
  d'e-mail doivent par ailleurs coïncider avec `additional_redirect_urls` de `supabase/config.toml`
- ⚠️ **`pathPrefix: '/rejoindre'` est impératif** dans l'intent filter Android : déclarer le domaine
  entier ferait intercepter par l'app la landing et les pages légales, que le site doit continuer
  d'ouvrir dans le navigateur
- `apps/mobile/src/app/+native-intent.tsx` réécrit le lien entrant en `/league/new?tab=join&code=…` **et retient
  le code au passage** (`pending-invite-store`, péremption 24 h) : sans session, les
  `<Stack.Protected>` renvoient sur `(auth)` et l'intention serait perdue. `usePendingInvite` le
  rejoue après l'inscription — **après que le guide d'accueil est résolu**, même piège que la
  permission notifications
- ⚠️ **Expo Router traite le lien APRÈS le montage de `(app)`**, pas avant : l'ordre mesuré est
  « nettoyage → `redirectSystemPath` → écriture » (traces du 2026-09-09). Tout nettoyage de
  l'invitation en attente qui s'en remet à cet ordre est donc illusoire — le code réécrit après
  coup survit et se rejoue à la navigation suivante, renvoyant sur « Rejoindre » un utilisateur
  qui vient d'ouvrir sa ligue. D'où `markInviteHonored` : **une invitation déjà présentée ne se
  rejoue pas**, quel que soit l'ordre. Ne pas remplacer cette mémoire par un `await` ou un délai
- ⚠️ **Ne pas passer `url` à `Share.share`** : iOS met alors le lien nu en avant et certaines cibles
  le substituent au message, faisant disparaître le nom de la ligue. L'URL vit **dans** le message ;
  ce sont les messageries qui la détectent pour bâtir l'aperçu, pas le système
- **`.well-known/` est généré, pas versionné** (`apps/web/scripts/build-well-known.mjs`, lancé en
  `prebuild`) à partir de `APPLE_TEAM_ID` et `ANDROID_CERT_FINGERPRINTS`, variables du projet
  Vercel : sans elles rien n'est écrit, comme les clés Aptabase/Sentry/Google. Une empreinte
  d'attente serait pire que l'absence de fichier — la vérification échouerait **en silence**.
  Déclarer **toutes** les empreintes SHA-256 (Play App Signing, clé d'importation, build de test),
  même piège que les clients OAuth Android. Le `Content-Type: application/json` de l'AASA est forcé
  par `apps/web/vercel.json` : le fichier n'a pas d'extension, et Apple rejette tout le reste sans rien dire
- **iOS reste inerte** tant qu'aucun abonnement Apple Developer ne fournit de Team ID : le code est
  complet, il ne manquera qu'une valeur à renseigner

## Versions

- **Une release se prépare par `npm run release -- --minor|--patch --notes "…"`** (`apps/mobile/scripts/release.mjs`, skill `trycast-release`), jamais à la main : le script bumpe les deux fichiers d'un geste, rejoue les vérifications de la CI, écrit `CHANGELOG.md`, commite et pose le tag annoté `vX.Y.Z` — qui déclenche `.github/workflows/release.yml` et la GitHub Release. Il ne pousse rien et ne build rien. Passer d'abord en `--dry-run` : c'est là que s'écrivent les notes, à partir des commits depuis le dernier tag
- ⚠️ **`expo.version` fait partie de l'empreinte** (vérifié le 2026-09-10 dans `@expo/fingerprint`) : **tout bump impose donc un build**, et un correctif JS se publie **sans bump**, par `npm run ota:prod`. Le script annonce le verdict avant d'écrire quoi que ce soit. **Ne pas ajouter `ExpoConfigVersions` aux `sourceSkips` de `fingerprint.config.js` — décision actée, ne pas la re-débattre** : le couplage version↔build est un garde-fou, découpler ferait afficher dans Réglages une version que le binaire ne porte pas
- **`app.json` → `expo.version` est la seule source de vérité** de la version « marketing » (celle affichée dans Réglages et sur les stores). Semver `MAJOR.MINOR.PATCH` — MINOR = ce qu'on annonce dans les notes de version, PATCH = ce qu'on corrige en silence ; jamais de bump à chaque lot livré. Valeur actuelle : `1.0.0` (le test interne Play s'est fait en 1.0.0, build 1, 2, 3… ; la beta fermée partira en 1.1.0, cf. « Feuille de route » de `DASHBOARD.md`)
- Le **numéro de build** (`versionCode` Android / `buildNumber` iOS) n'est **jamais** écrit dans le repo : EAS le gère seul (`appVersionSource: "remote"` + `autoIncrement` sur le profil production dans `eas.json`)
- `package.json` → `version` duplique `app.json` par convention npm : `apps/mobile/src/lib/app-version.test.ts` casse la CI si les deux divergent — **bumper les deux ensemble**
- Réglages affiche `nativeApplicationVersion (nativeBuildVersion)` d'`expo-application` (le binaire réellement installé), pas la version du bundle JS — et, dessous, le canal et l'identifiant court de la mise à jour à distance chargée : c'est la seule façon de savoir quel JS tourne chez un testeur, le numéro de build ne bougeant pas d'une OTA à l'autre
- `CHANGELOG.md` est le journal des versions distribuées, écrit par le script à partir des `--notes`. La 1.0.0 y figure sans tag (le commit du binaire en circulation n'est pas identifiable avec certitude) : la traçabilité par tag commence à la version suivante

## Dev builds

L'app tourne dans un dev build (`expo-dev-client`), pas Expo Go. **Toute lib native ajoutée/retirée, tout changement `app.json`/`app.config.ts`, toute montée de SDK ⇒ prévenir explicitement Corentin qu'un rebuild du dev client est nécessaire** (commande, quotas EAS et pièges : skill `trycast-dev-builds`).

## Vérification visuelle sur émulateur

Deux plateformes, deux skills : **iOS** (`trycast-ios-simulator`) et **Android**
(`trycast-android-emulator`). Dans les deux cas c'est un **dev build local** qui tourne, jamais Expo Go.

- Android : `npm run android:doctor` (diagnostic), `npm run android:emulator` (démarre l'AVD et attend qu'il soit prêt), `npm run android` (compile, installe, lance Metro). Prérequis machine : un **JDK 17** (`brew install openjdk@17`) — RN 0.86 déclare une toolchain 17, le JBR d'Android Studio est en Java 25. Tout l'environnement (JDK, `ANDROID_HOME`, `PATH`, `local.properties`, AVD) vient de `apps/mobile/scripts/android-env.sh`, **jamais** du `~/.zshrc` : npm exécute ses scripts via `sh`, qui ne le source pas
- ⚠️ **Un build release et un dev client ne peuvent pas cohabiter** : signatures différentes, l'installation échoue en `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Désinstaller d'abord (`adb uninstall com.cohozen.trycast`) — et vérifier **avant** toute passe visuelle Android que ce qui tourne est bien le dev client, sinon on observe le JS déjà publié en croyant tester son correctif (piège vécu le 2026-09-05)
- ⚠️ **Le téléphone de Corentin n'est plus une cible de développement** (acté le 2026-09-06, depuis que la chaîne Android locale tourne) : il porte la version du **test interne Play**, et rien d'autre. Ne jamais proposer d'y installer un dev client — les signatures diffèrent, il faudrait désinstaller le build du store. Corollaire à assumer : ce qui exige un appareil physique (les **notifications push**, absentes du simulateur comme de l'émulateur) se vérifie sur ce build distribué, au besoin après un `npm run ota:prod` — pas sur un dev client
- `apps/mobile/android/` et `apps/mobile/ios/` sont **générés et gitignorés** : rien ne s'y édite à la main, `npx expo prebuild --clean -p <platform>` les régénère


## Builds, environnements et OTA (Lot 9)

- Trois profils EAS, chacun lié à un environnement EAS **et** à un projet Supabase : `development` (APK dev client, bundle servi par Metro donc `.env` local), `preview` (release sur le projet **dev**, canal OTA `preview`), `production` (**AAB** pour la Play Console, projet **prod**, canal `production`). Commandes : `npm run build:dev|build:preview|build:prod`, `npm run env:preview|env:prod`
- ⚠️ Un build `preview`/`production` **inline les `EXPO_PUBLIC_*` au bundling côté serveur EAS**, pas depuis le `.env`. Une variable absente ne fait **pas** échouer le build : elle disparaît en silence (le bouton « Continuer avec Google » s'évapore sans message). Vérifier avec `npm run env:prod` avant de lancer
- **OTA en politique `fingerprint`.** Un correctif JS part par `npm run ota:prod -- --message "…"` (garde-fous dans `apps/mobile/scripts/ota.mjs` : arbre propre, typecheck + tests, message d'au moins 10 caractères). Un changement **natif** impose un build
- ⚠️ **Une mise à jour n'est délivrée qu'aux builds de même empreinte, et le non-appariement est MUET** : rien n'échoue, le correctif n'arrive jamais. Comparer avant publication — `npx expo-updates fingerprint:generate --platform android` contre la ligne *Fingerprint* de `npm run build:list`
- Le champ `scripts` d'`apps/mobile/package.json` est **exclu** de l'empreinte (`fingerprint.config.js`) : sans cela, ajouter une commande npm coupe les builds déjà distribués de toute mise à jour (vécu le 2026-09-03). Modifier ce fichier déplace l'empreinte — à ne toucher qu'avec une release
- **Comptes de démonstration des stores** : `scripts/seed-demo-account.mjs` (mot de passe en argument, jamais dans le dépôt ; `--project` exigé pour viser la prod). Ils portent `profiles.is_demo`, ce qui les **exclut du classement général** tout en les classant dans leur ligue — la colonne n'a aucun `grant`, personne ne peut se marquer soi-même
- **Play** : dossier complet dans `docs/stores/play-store.md`, visuels dans `docs/stores/assets/`. ⚠️ Déclarer **toutes** les empreintes de signature (clé de signature actuelle, précédente, et clé d'importation), une par client OAuth Android : n'en déclarer qu'une donne un `DEVELOPER_ERROR` irreproductible chez certains testeurs seulement

## Git

- Commits petits et fréquents : un commit = un changement cohérent (config ≠ reformatage ≠ feature), messages `type: description`
- **Jamais de `git push` sans autorisation explicite de Corentin**

## Supabase

- **Deux projets** (Lot 9) : un projet de **développement** — le seul que visent le `.env` local, les scripts et les agents — et la **production**, qui porte les vrais comptes et n'est touchée que par Corentin. **Aucun ref de projet n'est écrit en dur** : les scripts le déduisent de `EXPO_PUBLIC_SUPABASE_URL` du `.env` (`scripts/project-ref.mjs`) et les crons lisent l'URL des Edge Functions dans le Vault du projet où ils tournent (secret `edge_functions_base_url`). Ne jamais réintroduire un ref littéral dans une migration ou un script
- Schéma : uniquement par migrations dans `supabase/migrations/`, puis `supabase db push` + `npm run typegen`
- **Passage en prod** (migrations, seeds de référence, Edge Functions) : geste de Corentin. L'agent lui prépare la procédure et les commandes avec le skill `trycast-prod-rollout`
- ⚠️ **Une migration qui lit un secret Vault impose de le créer sur CHAQUE projet, prod comprise, avant son push** — `edge_functions_base_url` manquait en prod : tous les crons y ont échoué en silence du 2026-08-15 au 2026-09-15. Contrôle après un push prod : `select name from vault.secrets` et les derniers `cron.job_run_details`
- ⚠️ **Sur un projet neuf, les secrets Vault se créent AVANT `supabase db push`** (`edge_functions_base_url`, `sync_fixtures_secret`, `sync_results_secret`, `sync_live_secret`, `sync_tries_secret`, `notify_secret`) et les Edge Functions se déploient avant, sinon les premiers ticks cron frappent une URL absente
- Toute règle de sécurité (deadline prono au kickoff, accès données) est imposée par RLS côté serveur, le client n'est qu'une UX
- Edge Functions dans `supabase/functions/`, déploiement `supabase functions deploy <name>`
- Vérification E2E auth/RLS : `bash scripts/e2e-auth.sh` (utilisateurs de test : `scripts/seed-test-users.sql`), `bash scripts/e2e-predictions.sh` (matchs de test : `scripts/seed-test-predictions.sql`, à seeder après les users), `bash scripts/e2e-scoring.sh` + `scripts/e2e-scoring.sql` côté serveur (seed : `scripts/seed-test-scoring.sql`, à rejouer avant chaque exécution du .sql) , `bash scripts/e2e-leagues.sh` (seed : `scripts/seed-test-leagues.sql`, à rejouer avant chaque exécution) et `bash scripts/e2e-notifications.sh` (tokens push par RPC, préférences, tables serveur — seuls les users de test sont requis)
- E-mails d'auth : SMTP custom **Resend** (domaine `trycast.fr` vérifié, région EU) branché dans le dashboard Supabase Auth — rate limit relevé à 30 e-mails/h. Vérification : `EMAIL=une.vraie@adresse.fr bash scripts/e2e-email.sh` — ⚠️ envoie de vrais e-mails et crée des comptes de test (requête de nettoyage affichée en fin de run)
- Réinitialisation du mot de passe : **par code à 6 chiffres saisi dans l'app** (template `recovery` = `{{ .Token }}`, jamais un lien). Vérification en deux passes (le code n'est lisible que dans l'e-mail) : `EMAIL=… bash scripts/e2e-password-reset.sh` puis `EMAIL=… CODE=… bash scripts/e2e-password-reset.sh`
- Templates d'e-mails : `supabase/templates/*.html` sont **générés** par `scripts/build-email-templates.mjs` (`npm run emails:build`, `npm run emails:check`) — ne jamais les éditer à la main. Mise en ligne par `npm run emails:push` (API Management, champs e-mail uniquement, `--dry-run` disponible) — **pas** `supabase config push`, qui pousse toute la config sans dry-run et échoue sur ce projet. Contraintes du HTML d'e-mail et pièges : skill `trycast-emails`
- Outillage : `scripts/README.md` recense les scripts (e-mails, vérifications E2E et leurs seeds, ordre de seeding)
- **Essais : import Wikipedia, saisie admin en repli** (aucun fournisseur ne les expose). Le cron `sync-tries-30min` (EF `sync-tries`) lit les encadrés `{{rugbybox}}` des pages listées dans `competitions.wikipedia_pages` et **n'écrit que si le décompte reconstitue le score Highlightly** — ne jamais assouplir ce contrôle, c'est lui qui rend une source tenue par des bénévoles exploitable. Écriture par la même RPC que la saisie manuelle. Une nouvelle compétition passe d'abord par le mode `audit` de l'EF (le format des pages varie : la RWC 2023 n'a pas de `{{rugbybox}}`). Scraper L'Équipe/Flashscore a été écarté (CGU, droit des bases de données) — ne pas le reproposer. Repli : vue `admin_matches_pending_tries` pour voir ce qui reste à faire et RPC `admin_set_match_tries(api_game_id, domicile, extérieur)` pour saisir — les deux réservées à `service_role`, s'utilisent depuis le SQL editor Supabase (`scripts/admin-set-tries.sql`, dont la requête des rejets de l'import). **Pas d'app d'administration** : décision actée, ne pas la reproposer tant qu'une deuxième tâche d'admin n'existe pas ; ce serait alors une app à part, jamais greffée sur le site Astro
- ⚠️ Piège `db push` : dans `supabase/config.toml`, les `content_path` de `[auth.email.template.*]` sont relatifs à la **racine du projet** (`./supabase/templates/…`) alors que ceux de `[auth.email.notification.*]` le sont au **dossier `supabase/`** (`./templates/…`). Aligner les deux blocs sur la même forme fait échouer `supabase db push` à la validation de la config, avant toute écriture

## RGPD

- Documentation de conformité dans **`docs/rgpd/`** : registre des traitements (art. 30), sous-traitants, procédure de réponse aux demandes de droits, brouillon des fiches stores. Rien de secret n'y figure — **jamais de nom réel ni d'adresse personnelle**, l'éditeur y est toujours `contact@trycast.fr`
- **Un traitement se déclare avant sa mise en service.** Brancher un outil qui voit des données d'utilisateurs (analytics, crash reporting, e-mailing, hébergeur) impose de mettre à jour dans le **même lot** : `docs/rgpd/registre-des-traitements.md`, `docs/rgpd/sous-traitants.md`, `apps/web/src/pages/confidentialite.astro` **et sa traduction `apps/web/src/pages/en/privacy.astro`** et, si l'app est publiée, les déclarations des stores
- **Télémétrie en service** : **Aptabase** (EU, sessions anonymes) pour la mesure d'usage, **Sentry** (EU, Francfort) pour les plantages et les signalements envoyés depuis l'app (registre §11 ; eux partent même diagnostics coupés, c'est un geste explicite). Les deux sont **actifs par défaut et désactivables** dans Réglages → Confidentialité, et **inertes sans leur clé** (`EXPO_PUBLIC_APTABASE_KEY`, `EXPO_PUBLIC_SENTRY_DSN`) — la CI et un clone frais tournent sans configuration
- Le garde-fou runtime est une **préférence locale** (`apps/mobile/src/features/privacy/telemetry-state.ts`, lu de façon synchrone), **pas** la table `consents` : les SDK démarrent avant toute session, or `consents` est indexée sur `auth.uid()`. La table est la trace horodatée du choix
- **Nouvel événement de mesure = une entrée dans le catalogue typé** `apps/mobile/src/lib/analytics-events.ts`. Y passer un identifiant, un pseudo ou un e-mail est une erreur de compilation (verrouillée par des `@ts-expect-error`) — ne jamais contourner en élargissant le type des propriétés
- Détails, pièges de build (erreur 65 de `sentry-cli`) et procédure de vérification : skill `trycast-telemetry`
- Vérification : `bash scripts/e2e-privacy.sh` et `scripts/e2e-waitlist.sql`

## Secrets

`apps/mobile/.env` (non versionné, modèle `apps/mobile/.env.example` ; lu aussi par les scripts de la racine) : `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_KEY` (clé publishable uniquement — jamais de service role key côté client ni dans le repo). S'y ajoutent les identifiants publics des fournisseurs d'identité (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) ; le *client secret* Google ne vit **que** dans le dashboard Supabase.

## Connexion par fournisseur d'identité

- **Ajouter un fournisseur se fait dans `apps/mobile/src/features/auth/providers.ts`, et nulle part ailleurs** : il déclare par plateforme la mécanique d'ouverture de session (`native-id-token` via `signInWithIdToken`, ou `web-redirect` via le navigateur système et `trycast://auth/callback`). Les écrans itèrent sur `resolveProviders(Platform.OS)` et **ne nomment aucun fournisseur** — un `if (provider === 'google')` dans un écran est une régression
- Un fournisseur dont les identifiants ne sont pas configurés n'est **pas** proposé : la CI et un clone frais tournent sans configuration, comme pour Aptabase/Sentry
- **Google en service** (Android + simulateur iOS). Le client OAuth **web** est celui que l'app Android passe à `GoogleSignin.configure({ webClientId })` — pas le client Android, qui n'existe que pour la validation par empreinte **SHA-1**. ⚠️ À l'ouverture de l'alpha Play, créer un **second client Android** avec la SHA-1 de la clé Play App Signing (un client = un couple package + SHA-1), sinon `DEVELOPER_ERROR` sur le build distribué
- **Apple : différé**, faute d'abonnement Apple Developer (99 €/an, seul moyen d'obtenir un Services ID) — le code l'attend, cf. le commentaire d'extension dans `providers.ts`. Rappel : l'App Store impose Sign in with Apple dès qu'un autre login social est proposé ; Play non
- Un compte créé via un fournisseur n'apporte **pas de pseudo** : `profiles.username_chosen` vaut alors `false` et un troisième `Stack.Protected` envoie sur `(onboarding)` avant l'accueil. Seule la RPC `claim_username` peut repasser la colonne à `true`
- Ces comptes n'ont ni mot de passe ni adresse modifiable : les rangées correspondantes des Réglages sont masquées via `hasPasswordIdentity()` de `apps/mobile/src/features/auth/identity.ts`
