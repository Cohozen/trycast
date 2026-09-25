# TryCast — instructions agents

App mobile de pronostics rugby (Expo + Supabase), projet portfolio solo de Corentin. Setup complet : `README.md` ; état et reste à faire : `DASHBOARD.md`.

Ce fichier ne garde que ce qu'un agent pourrait casser sans ouvrir de skill. Le détail vit dans les skills `trycast-*` (`.claude/skills/`) : **ouvrir le skill nommé avant de toucher à son périmètre**.

**Priorité** : ce fichier et les skills `trycast-*` priment sur les modes des plugins installés chez Corentin (Ponytail, Caveman). « Le moins de fichiers possible » ne défait pas « un composant par fichier », un `assert` ne remplace pas les tests Vitest colocalisés, et le style compressé ne s'applique jamais à un fichier du dépôt.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Organisation du dépôt

Deux apps et un backend commun, **sans workspaces npm** (un `package.json` et un lock par dossier, trois `npm ci`) :

- `apps/mobile/` — l'app Expo : `app.json`, `app.config.ts`, `eas.json`, `fingerprint.config.js`, `CHANGELOG.md`, `src/`, `assets/`, ses scripts (`release`, `ota`, `android-*`), son `.env` et `google-services.json` (non versionnés). **`eas`, `expo` et `npm run android|ios|start|build:*|ota:*|env:*|release|typecheck|lint|test|verify` se lancent depuis `apps/mobile`**
- `apps/web/` — le site Astro (voir « Site web »)
- `supabase/` — **à la racine, pas dans `apps/`** : backend des deux apps, et la CLI `supabase` cherche ce dossier dans le répertoire courant. `supabase`, `bash scripts/e2e-*.sh` et les seeds se lancent **depuis la racine**
- `scripts/` (racine) — outillage commun (`typegen`, `emails:*`, `deps:check`, E2E, seeds), recensé dans `scripts/README.md`. Ils lisent le `.env` de `apps/mobile` (`scripts/project-ref.mjs`), seule source du projet Supabase visé
- `package.json` racine — outillage seul (Biome, Vitest) : `npm run format`, `npm test` (tests des Edge Functions), `npm run verify` (tout, app comprise)

⚠️ Couplages de la disposition, à ne pas défaire :
- **Le barème est partagé** : `apps/mobile/src/features/scoring/*.ts` réexporte `supabase/functions/_shared/scoring/`, hors du projet Expo. `apps/mobile/metro.config.js` ajoute ce dossier aux `watchFolders` ; sans cela, Metro refuse le fichier
- **`apps/mobile/.gitignore` est versionné exprès** : `@expo/fingerprint` hache le `.gitignore` du projet et `expo start` le recrée s'il manque. Les règles communes vont dans le `.gitignore` racine, qui n'entre pas dans l'empreinte
- **Jamais de `tsconfig.json` à la racine ni dans `apps/`** : la découverte tsconfig de rolldown remonte au-dessus du site et casserait son build (skill `trycast-site-web`)

## Stack (versions figées, ne pas downgrader)

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript ~6.0, Expo Router (typed routes + react compiler activés)
- NativeWind v5 preview + Tailwind CSS v4 (styling via `className`, helpers dans `apps/mobile/src/tw/`)
- Supabase JS v2 typé (`Database` de `apps/mobile/src/lib/database.types.ts` — fichier généré, ne jamais l'éditer à la main : `npm run typegen`)
- TanStack Query v5, Vitest v4

## Vérification

Avant de considérer un lot terminé : `npm run verify` **à la racine** — formatage de tout le dépôt, tests des Edge Functions, puis typecheck, lint (`--max-warnings 0`) et tests de l'app. La CI exécute la même chose. Le site a sa vérification propre (voir « Site web »).

**Dépendances** — `npm run deps:check` range ce qui est en retard, sans rien modifier. ⚠️ `latest` est un piège pour tout ce que le **SDK pilote** : ces versions montent en bloc avec le SDK, et **toute montée d'un paquet natif déplace l'empreinte** (donc coupe les builds distribués de l'OTA, à caler sur une release). Une majeure non prise se justifie dans `docs/dependances.md` ; recette dans `scripts/README.md`.

## Sous-agents (`.claude/agents/`)

Je les lance de moi-même, sans attendre qu'on le demande. Un agent créé en cours de session n'est lançable qu'au tour suivant (« Agent type not found » d'ici là).
- `relecteur` — avant chaque commit de code, jamais pour un commit de doc ou de config (son démarrage coûte ~40 k tokens) : relit le diff contre les conventions ci-dessous
- `docs-lot` — à la fin de chaque lot, même une retouche : met à jour `AGENTS.md`, les skills, `docs/rgpd/` et `DASHBOARD.md` (sans commiter)
- `verif-visuelle` — pour chaque passe visuelle sur émulateur ou simulateur

## Conventions

- Alias d'import `@/` → `apps/mobile/src/`
- Écrans dans `apps/mobile/src/app/` (groupes `(auth)` et `(app)`), logique métier par domaine dans `apps/mobile/src/features/<domaine>/` avec tests `*.test.ts` colocalisés (skill `trycast-domain-feature`)
- **i18n : FR = langue source, jamais de chaîne UI en dur.** Toute chaîne visible passe par i18next : ressources dans `apps/mobile/src/locales/fr/<namespace>.json` (un namespace par domaine + `common`), clés typées (une clé manquante casse `tsc`). Les fonctions de domaine (`errors.ts`, `validation.ts`) retournent des **clés i18n**, traduites dans l'écran via `t()` avec `useTranslation(['<ns>', 'common'])`. Dates/nombres via `Intl` avec `i18n.language`
- **Ponctuation des textes visibles** (app, e-mails, site, fiches des stores) : tiret simple « - », **jamais de tiret cadratin « — »**. Seule exception, voulue : le « — » de **valeur absente** dans le code de l'app, qui reste (skill `trycast-domain-feature`). Les commentaires ne sont pas concernés
- Logique de scoring : module TS pur testable unitairement + écriture atomique via une seule RPC SQL (décision actée, ne pas re-débattre)
- **Règles de jeu actées** — joker par phase, phases finales, réactions, coup de la journée, guide d'accueil : skill **`trycast-regles-metier`**, à ouvrir dès qu'on touche à `features/{jokers,reactions,leagues,welcome,celebration}/`, au scoring, à `seed-competitions.sql` ou à l'EF `notify`. Invariants à ne jamais casser sans l'ouvrir :
  - joker et étapes KO sont des **fenêtres de dates** (`competition_phases`, `competition_stages`), jamais `matches.round` ; une nouvelle compétition reçoit ses phases et étapes **avant** son premier match
  - réactions : **quatre clés fermées, jamais de texte libre**, le serveur stocke la clé, pas l'emoji
  - `notification_sends` : unicité `(user_id, match_id, type, league_id)` **nulls not distinct** → `onConflict` à 4 colonnes pour **tous** les types
  - la fermeture du guide d'accueil relaie la première demande de permission notifications et l'invitation en attente — jamais d'appel direct au montage
  - joker = vert marque ; réactions = ni grenat ni vert
- **État local et compte** : une préférence locale qui décrit ce qu'**un utilisateur** a vu ou fait se range **par compte** (clé suffixée par l'id). Restent par appareil, exprès : guide d'accueil, thème, interrupteurs de télémétrie
- **Un composant par fichier, un fichier par composant** (fichier nommé comme le composant, en kebab-case)
- Tout composant réutilisable va dans `apps/mobile/src/components/` (primitives UI dans `apps/mobile/src/components/ui/`) ; un composant propre à un domaine reste dans `apps/mobile/src/features/<domaine>/components/`
- Types partagés dans des fichiers dédiés : `apps/mobile/src/features/<domaine>/types.ts` par domaine (pas de fourre-tout global) ; les props d'un composant restent colocalisées avec lui tant qu'elles ne sont pas réutilisées ailleurs
- **Design system** (skill `trycast-design-system`, référence `docs/design/`) : tokens dans `apps/mobile/src/global.css` (`@theme` Tailwind v4 — `bg-bg`/`bg-surface`/`text-text`/`text-text-muted`/`bg-accent`…, light + dark via `light-dark()`, typo Anton/Inter, radius, ombres `tc-shadow-*`). Le grenat (`accent`) est une étincelle, jamais un fond ; le vert est la marque (`brand`), pas un fond (seule exception voulue par la maquette : la carte « Tes points » de l'accueil, `my-points-card.tsx`). Primitives `sand-*`, `char-*`, `paper-*`, `ink-*`, `green-*`, `grenat-*` seulement pour les couleurs **figées quel que soit le thème** ; `cream-*`/`mist-300` = rampe v1 **legacy** (marque et drapeaux uniquement)
- Styles : classes NativeWind inline (`className`) via les **tokens du DS** (jamais de couleur Tailwind brute type `bg-blue-600`, ni de hex en dur hors cas documenté) ; style répété ⇒ primitive `components/ui/` ou variant ; composition conditionnelle via `cn()` de `apps/mobile/src/tw/variants.ts` — pas de `StyleSheet.create` sauf impossibilité Tailwind. Polices : `font-display` (Anton) pour titres/scores, `font-body[-medium|-semibold|-bold]` (Inter) pour le reste — en natif, `font-semibold` seul ne change pas la graisse d'une police custom
- Marges d'écran : jamais de padding haut/bas d'écran en dur (`pt-14`, `pb-32`) — `useScreenInsets()` de `@/tw/use-screen-insets`, valeurs passées en `style`/`contentContainerStyle`
- Pressable qui toggle des classes à variables CSS au press (`scale-*`, `shadow-*`) : classe `will-change-variable` dans ses classes de base, sinon react-native-css remonte le composant au premier press
- **Signaler un problème** (`apps/mobile/src/features/feedback/`) : `Sentry.captureFeedback`, e-mail et pseudo joints seulement si la case est cochée, **jamais `Sentry.setUser`** ; contexte d'écran en **liste blanche**, le code d'invitation ne part jamais (skill `trycast-telemetry`)

## Site web (`apps/web/`)

Skill **`trycast-site-web`** pour tout le reste (structure, bilingue, preview, waitlist, déploiement Vercel).
- Astro **statique**, `package.json` propre — ne pas mélanger ses deps avec celles d'`apps/mobile`
- **Bilingue FR/EN** : FR à la racine, EN sous `/en/`, aucune chaîne en dur (`apps/web/src/i18n/fr.ts` / `en.ts`), slugs dans la table `routes` de `apps/web/src/i18n/index.ts`. **Pas de redirection automatique** selon le navigateur
- **Pages légales : le français seul fait foi.** Modifier l'une, c'est modifier sa jumelle `/en/` **dans le même commit** et avancer `legalUpdatedAt` (`npm run check` compare leur structure). `legalUrl()` d'`apps/mobile/src/lib/urls.ts` **réplique** les slugs légaux : `urls.test.ts` casse s'ils divergent
- Tokens DS **copiés** dans `apps/web/src/styles/tokens.css` (non verrouillés par un test : répercuter toute mise à jour du DS)
- Vérification : `cd apps/web && npm run check && npm run build` (CI dédiée `.github/workflows/web.yml`)

## Liens d'invitation de ligue

Skill **`trycast-liens-invitation`** (côté app) et `trycast-site-web` (côté site). Invariants :
- URL unique `https://www.trycast.fr/rejoindre/<CODE>`, construite par `buildInviteUrl()` seulement ; répliquée dans le `rewrite` d'`apps/web/vercel.json`, le `pathPrefix` des `intentFilters` d'`app.json` et `INVITE_PATH_SEGMENT` — **en changer une impose les quatre**
- ⚠️ `pathPrefix: '/rejoindre'` impératif (sinon l'app intercepte tout le site) ; hôte `www.trycast.fr`, apex non déclaré
- ⚠️ `markInviteHonored` : une invitation déjà présentée ne se rejoue pas — ne pas la remplacer par un `await` ou un délai
- ⚠️ Ne pas passer `url` à `Share.share` : l'URL vit dans le message

## Versions, builds et OTA

Skills **`trycast-release`** (version, empreinte, OTA, profils EAS) et **`trycast-dev-builds`** (quand et comment rebuilder).
- **Une release se prépare par `npm run release -- --minor|--patch --notes "…"`** (en `--dry-run` d'abord), jamais à la main. Il ne pousse ni ne build rien
- `app.json` → `expo.version` est la seule source de vérité de la version marketing ; `package.json` la duplique, **bumper les deux ensemble**. Le numéro de build n'est **jamais** écrit dans le dépôt (EAS le gère)
- ⚠️ **`expo.version` fait partie de l'empreinte** : tout bump impose un build, un correctif JS part **sans bump** par `npm run ota:prod`. **Ne pas ajouter `ExpoConfigVersions` aux `sourceSkips` — décision actée**
- ⚠️ **Une OTA n'atteint que les builds de même empreinte, et le non-appariement est MUET** : comparer avant publication. `fingerprint.config.js` et le champ `scripts` d'`apps/mobile/package.json` (exclu de l'empreinte) ne se touchent qu'avec une release
- ⚠️ Un build `preview`/`production` inline les `EXPO_PUBLIC_*` sur les serveurs EAS : une variable absente disparaît en silence — `npm run env:prod` avant de lancer
- **Dev builds** (`expo-dev-client`, pas Expo Go) : **toute lib native ajoutée/retirée, tout changement `app.json`/`app.config.ts`, toute montée de SDK ⇒ prévenir explicitement Corentin qu'un rebuild du dev client est nécessaire**
- `apps/mobile/android/` et `apps/mobile/ios/` sont **générés et gitignorés** : `npx expo prebuild --clean -p <platform>`, rien ne s'y édite
- Dossier Play : `docs/stores/play-store.md`. ⚠️ Déclarer **toutes** les empreintes de signature (actuelle, précédente, importation), une par client OAuth Android, sinon `DEVELOPER_ERROR` chez certains testeurs seulement

## Vérification visuelle

Sous-agent `verif-visuelle`, skills **`trycast-android-emulator`** et **`trycast-ios-simulator`** : c'est un **dev build local** qui tourne, jamais Expo Go ni le web.
- ⚠️ **Le téléphone de Corentin n'est pas une cible de développement** : il porte le build du test interne Play. Ne jamais y proposer un dev client. Ce qui exige un appareil physique (push) se vérifie sur ce build distribué, au besoin après `npm run ota:prod`
- ⚠️ Vérifier **avant** toute passe Android que ce qui tourne est bien le dev client (un build release n'atteint jamais Metro)
- Données : `node --no-warnings scripts/seed-demo.mjs` juste avant chaque passe (héros `hugo@demo.trycast.local`)

## Git

- Commits petits et fréquents : un commit = un changement cohérent (config ≠ reformatage ≠ feature), messages `type: description`
- **Jamais de `git push` sans autorisation explicite de Corentin**

## Supabase

Skills **`trycast-supabase-migration`** (schéma, RLS, RPC, E2E, essais Wikipedia), **`trycast-prod-rollout`** (mise en prod), **`trycast-emails`** (templates d'auth).
- **Deux projets** : **développement** — le seul que visent le `.env` local, les scripts et les agents — et **production**, touchée par Corentin seulement. **Aucun ref de projet écrit en dur** : les scripts le déduisent du `.env` (`scripts/project-ref.mjs`), les crons lisent l'URL des EF dans le Vault (`edge_functions_base_url`)
- Schéma uniquement par migrations dans `supabase/migrations/`, puis `supabase db push` + `npm run typegen`. Edge Functions : `supabase functions deploy <name>`
- **Passage en prod** (migrations, seeds de référence, EF) : geste de Corentin, procédure préparée avec le skill `trycast-prod-rollout`
- ⚠️ **Une migration qui lit un secret Vault impose de le créer sur CHAQUE projet, prod comprise, avant son push** (les crons prod ont échoué en silence un mois pour un secret manquant). Sur un projet neuf, secrets Vault (`edge_functions_base_url`, `sync_fixtures_secret`, `sync_results_secret`, `sync_live_secret`, `sync_tries_secret`, `notify_secret`, `sentry_cron_checkin_url`) et EF **avant** `supabase db push`
- Toute règle de sécurité (deadline prono au kickoff, accès données) est imposée par RLS côté serveur, le client n'est qu'une UX
- E-mails : templates `supabase/templates/*.html` **générés** (`npm run emails:build`), mis en ligne par `npm run emails:push` — **jamais `supabase config push`**. Reset du mot de passe **par code à 6 chiffres**, jamais un lien
- **Essais** : import Wikipedia qui **n'écrit que si le décompte reconstitue le score** — ne jamais assouplir ce contrôle ; scraping L'Équipe/Flashscore écarté. **Pas d'app d'administration** (décision actée) ; si un jour, une app à part, jamais greffée sur Astro

## RGPD

- Conformité dans **`docs/rgpd/`** (registre, sous-traitants, droits, brouillon des fiches stores). **Jamais de nom réel ni d'adresse personnelle**, l'éditeur est `contact@trycast.fr`
- **Un traitement se déclare avant sa mise en service.** Brancher un outil qui voit des données d'utilisateurs, ou changer ce qu'on collecte, met à jour dans le **même lot** : `docs/rgpd/registre-des-traitements.md`, `docs/rgpd/sous-traitants.md`, `apps/web/src/pages/confidentialite.astro` **et** `apps/web/src/pages/en/privacy.astro`, et les déclarations des stores si l'app est publiée
- Télémétrie (Aptabase + Sentry, EU, actives par défaut, désactivables, inertes sans clé) : skill **`trycast-telemetry`**. Le garde-fou runtime est une **préférence locale**, pas la table `consents`. **Nouvel événement = une entrée du catalogue typé** `apps/mobile/src/lib/analytics-events.ts` ; ne jamais élargir son type pour y passer un identifiant, pseudo ou e-mail
- Vérification : `bash scripts/e2e-privacy.sh` et `scripts/e2e-waitlist.sql`

## Secrets

`apps/mobile/.env` (non versionné, modèle `.env.example`, lu aussi par les scripts de la racine) : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (clé publishable uniquement — **jamais de service role key côté client ni dans le repo**), identifiants publics Google (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) ; le *client secret* Google ne vit que dans le dashboard Supabase.

## Connexion par fournisseur d'identité

- **Un fournisseur s'ajoute dans `apps/mobile/src/features/auth/providers.ts`, et nulle part ailleurs** (mécanique par plateforme : `native-id-token` via `signInWithIdToken`, ou `web-redirect` via `trycast://auth/callback`). Les écrans itèrent sur `resolveProviders(Platform.OS)` et **ne nomment aucun fournisseur** — un `if (provider === 'google')` dans un écran est une régression. Sans identifiants configurés, un fournisseur n'est pas proposé
- **Google en service** : l'app Android passe le client OAuth **web** à `GoogleSignin.configure({ webClientId })` ; les clients Android n'existent que pour la validation par empreinte **SHA-1** (un client par couple package + SHA-1)
- **Apple en service sur iOS seulement**, en premier dans la liste : flux natif (`apple-sign-in.ts`), SHA-256 du nonce envoyé à Apple, nonce brut à `signInWithIdToken`, portée `EMAIL` seule. **Pas d'Apple sur Android, exprès** (le flux navigateur exigerait un Services ID et un secret à renouveler tous les six mois). Seul `ERR_REQUEST_CANCELED` est un renoncement : toute autre erreur s'affiche
- Un compte créé via un fournisseur n'a **pas de pseudo** : `profiles.username_chosen = false` envoie sur `(onboarding)`, et seule la RPC `claim_username` le repasse à `true`. Ni mot de passe ni adresse modifiable : rangées des Réglages masquées via `hasPasswordIdentity()`
