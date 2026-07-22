# TryCast — instructions agents

App mobile de pronostics rugby (Expo + Supabase), projet portfolio solo de Corentin. Voir `README.md` pour le setup complet.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Stack (versions figées, ne pas downgrader)

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript ~6.0, Expo Router (typed routes + react compiler activés)
- NativeWind v5 preview + Tailwind CSS v4 (styling via `className`, helpers dans `src/tw/`)
- Supabase JS v2 typé (`Database` de `src/lib/database.types.ts` — fichier généré, ne jamais l'éditer à la main : `npm run typegen`)
- TanStack Query v5, Vitest v4

## Commandes de vérification

Avant de considérer un lot terminé : `npm run typecheck && npm run lint && npm run format:check && npm run test`. La CI GitHub Actions exécute la même chose.

## Conventions

- Alias d'import `@/` → `src/`
- Écrans dans `src/app/` (groupes `(auth)` et `(app)`), logique métier par domaine dans `src/features/<domaine>/` avec tests `*.test.ts` colocalisés
- **i18n : FR = langue source, jamais de chaîne UI en dur.** Toute chaîne visible passe par i18next : ressources dans `src/locales/fr/<namespace>.json` (un namespace par domaine, calqué sur `src/features/` + `common`), clés typées (une clé manquante casse `tsc`). Les fonctions de domaine (`errors.ts`, `validation.ts`) retournent des **clés i18n**, la traduction se fait dans l'écran via `t()` avec `useTranslation(['<ns>', 'common'])`. Dates/nombres via `Intl` avec `i18n.language`
- Logique de scoring : module TS pur testable unitairement + écriture atomique via une seule RPC SQL (décision actée, ne pas re-débattre)
- **Un composant par fichier, un fichier par composant** (fichier nommé comme le composant, en kebab-case)
- Tout composant réutilisable va dans `src/components/` (primitives UI dans `src/components/ui/`) ; un composant propre à un domaine reste dans `src/features/<domaine>/components/`
- Types partagés dans des fichiers dédiés : `src/features/<domaine>/types.ts` par domaine (pas de fourre-tout global) ; les props d'un composant restent colocalisées avec lui tant qu'elles ne sont pas réutilisées ailleurs
- **Design system (Lot 5.5)** : tokens dans `src/global.css` (`@theme` Tailwind v4 — couleurs sémantiques `bg-bg`/`bg-surface`/`text-text`/`text-text-muted`/`bg-accent`…, light + dark via `light-dark()`, typo Anton/Inter, radius, ombres `tc-shadow-*`). Référence complète : `docs/design/` (livrable Claude Design) et le skill `trycast-design-system`. Le grenat (`accent`) est une étincelle, jamais un fond ; surfaces neutres chaudes (v2) : light = base sable/blanc, dark = base charbon chaud ; le vert est la marque (`brand`), pas un fond
- Styles : classes NativeWind inline dans le JSX (`className`) via les **tokens du DS** (jamais de couleur Tailwind brute type `bg-blue-600`, ni de hex en dur hors cas documenté) ; dès qu'un style se répète, extraire une primitive `src/components/ui/` ou un variant ; composition conditionnelle via `cn()` de `src/tw/variants.ts` — pas de `StyleSheet.create` sauf impossibilité Tailwind. Polices : `font-display` (Anton) pour titres/scores, `font-body[-medium|-semibold|-bold]` (Inter) pour le reste — en natif, `font-semibold` seul ne change pas la graisse d'une police custom
- Marges d'écran : jamais de padding haut/bas d'écran en dur (`pt-14`, `pb-32`) — `useScreenInsets()` de `@/tw/use-screen-insets` (safe areas avec planchers DS), valeurs passées en `style`/`contentContainerStyle` (détails et piège react-native-css dans le skill `trycast-design-system`)
- Composant pressable qui toggle des classes à variables CSS au press (`scale-*`, `shadow-*`) : classe `will-change-variable` dans les classes de base du `Pressable`, sinon react-native-css remonte le composant au premier press (détails dans le skill `trycast-design-system`)

## Site web (`web/`)

- Site vitrine **Astro statique** (landing + waitlist + pages légales), sous-dossier autonome avec son propre `package.json` — **pas de workspaces npm**, ne pas mélanger avec les deps Expo
- Styles : CSS scopé Astro avec les tokens DS copiés dans `web/src/styles/tokens.css` (custom properties `--bg`/`--surface`/`--accent`…, dark via `[data-theme='dark']`) ; polices Anton/Inter self-hostées via `@fontsource` (pas de CDN Google Fonts) ; mêmes règles DS que l'app (grenat = étincelle, jamais un fond)
- Vérification : `cd web && npm run check && npm run build` — CI dédiée `.github/workflows/web.yml` (la CI app ignore `web/**`)
- Preview navigateur : config `site-web` de `.claude/launch.json` (port 4321) ; piège : après un scroll, la capture d'écran du panneau navigateur rend une page vide — translater `document.body` en JS au lieu de scroller
- Formulaire waitlist : RPC `join_waitlist` (migration `20260715000100_waitlist.sql`) appelée en fetch direct PostgREST, env `web/.env` (`PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_KEY`, modèle `web/.env.example`) ; anti-spam côté SQL (rate limit IP 3/h + plafond global 100/h + refus silencieux) + honeypot côté client — pas d'accès direct aux tables `waitlist_*`
- Hébergement : **Vercel** (Root Directory `web`, build sur push GitHub) — le `installCommand` de `web/vercel.json` pose un stub `expo/tsconfig.base.json` requis par la découverte tsconfig de rolldown (piège détaillé dans le skill `trycast-site-web`) ; le connecteur Vercel de Claude ne voit pas le projet (scope), passer par git push

## Versions

- **`app.json` → `expo.version` est la seule source de vérité** de la version « marketing » (celle affichée dans Réglages et sur les stores). Semver `MAJOR.MINOR.PATCH`, bumpée **à la main, au moment de préparer une release store** — jamais à chaque lot livré : MINOR = nouvelles fonctionnalités, PATCH = correctifs. Valeur actuelle : `1.0.0` (rien n'est encore publié ; la beta TestFlight / Play interne se fait en 1.0.0, build 1, 2, 3…)
- Le **numéro de build** (`versionCode` Android / `buildNumber` iOS) n'est **jamais** écrit dans le repo : EAS le gère seul (`appVersionSource: "remote"` + `autoIncrement` sur le profil production dans `eas.json`)
- `package.json` → `version` duplique `app.json` par convention npm : `src/lib/app-version.test.ts` casse la CI si les deux divergent — **bumper les deux ensemble**
- Réglages affiche `nativeApplicationVersion (nativeBuildVersion)` d'`expo-application` (le binaire réellement installé), pas la version du bundle JS

## Dev builds

L'app tourne dans un dev build (`expo-dev-client`), pas Expo Go. **Toute lib native ajoutée/retirée, tout changement `app.json`/`app.config.ts`, toute montée de SDK ⇒ prévenir explicitement Corentin qu'un rebuild du dev client est nécessaire** (commande, quotas EAS et pièges : skill `trycast-dev-builds`).

## Git

- Commits petits et fréquents : un commit = un changement cohérent (config ≠ reformatage ≠ feature), messages `type: description`
- **Jamais de `git push` sans autorisation explicite de Corentin**

## Supabase

- Projet dev `trycast-dev`, lié via `supabase link` (l'id du projet se retrouve avec `supabase projects list`)
- Schéma : uniquement par migrations dans `supabase/migrations/`, puis `supabase db push` + `npm run typegen`
- Toute règle de sécurité (deadline prono au kickoff, accès données) est imposée par RLS côté serveur, le client n'est qu'une UX
- Edge Functions dans `supabase/functions/`, déploiement `supabase functions deploy <name>`
- Vérification E2E auth/RLS : `bash scripts/e2e-auth.sh` (utilisateurs de test : `scripts/seed-test-users.sql`), `bash scripts/e2e-predictions.sh` (matchs de test : `scripts/seed-test-predictions.sql`, à seeder après les users), `bash scripts/e2e-scoring.sh` + `scripts/e2e-scoring.sql` côté serveur (seed : `scripts/seed-test-scoring.sql`, à rejouer avant chaque exécution du .sql) , `bash scripts/e2e-leagues.sh` (seed : `scripts/seed-test-leagues.sql`, à rejouer avant chaque exécution) et `bash scripts/e2e-notifications.sh` (tokens push par RPC, préférences, tables serveur — seuls les users de test sont requis)
- E-mails d'auth : SMTP custom **Resend** (domaine `trycast.fr` vérifié, région EU) branché dans le dashboard Supabase Auth — rate limit relevé à 30 e-mails/h. Vérification : `EMAIL=une.vraie@adresse.fr bash scripts/e2e-email.sh` — ⚠️ envoie de vrais e-mails et crée des comptes de test (requête de nettoyage affichée en fin de run)
- Réinitialisation du mot de passe : **par code à 6 chiffres saisi dans l'app** (template `recovery` = `{{ .Token }}`, jamais un lien). Vérification en deux passes (le code n'est lisible que dans l'e-mail) : `EMAIL=… bash scripts/e2e-password-reset.sh` puis `EMAIL=… CODE=… bash scripts/e2e-password-reset.sh`
- Templates d'e-mails : `supabase/templates/*.html` sont **générés** par `scripts/build-email-templates.mjs` (`npm run emails:build`, `npm run emails:check`) — ne jamais les éditer à la main. Mise en ligne par `npm run emails:push` (API Management, champs e-mail uniquement, `--dry-run` disponible) — **pas** `supabase config push`, qui pousse toute la config sans dry-run et échoue sur ce projet. Contraintes du HTML d'e-mail et pièges : skill `trycast-emails`
- Outillage : `scripts/README.md` recense les scripts (e-mails, vérifications E2E et leurs seeds, ordre de seeding)
- ⚠️ Piège `db push` : dans `supabase/config.toml`, les `content_path` de `[auth.email.template.*]` sont relatifs à la **racine du projet** (`./supabase/templates/…`) alors que ceux de `[auth.email.notification.*]` le sont au **dossier `supabase/`** (`./templates/…`). Aligner les deux blocs sur la même forme fait échouer `supabase db push` à la validation de la config, avant toute écriture

## RGPD

- Documentation de conformité dans **`docs/rgpd/`** : registre des traitements (art. 30), sous-traitants, procédure de réponse aux demandes de droits, brouillon des fiches stores. Rien de secret n'y figure — **jamais de nom réel ni d'adresse personnelle**, l'éditeur y est toujours `contact@trycast.fr`
- **Un traitement se déclare avant sa mise en service.** Brancher un outil qui voit des données d'utilisateurs (analytics, crash reporting, e-mailing, hébergeur) impose de mettre à jour dans le **même lot** : `docs/rgpd/registre-des-traitements.md`, `docs/rgpd/sous-traitants.md`, `web/src/pages/confidentialite.astro` et, si l'app est publiée, les déclarations des stores
- Décidé, pas encore branché : **Aptabase** (EU, sessions anonymes) pour la mesure d'usage et **Sentry région EU** pour les plantages. Sentry est un module natif ⇒ rebuild du dev client. Le `check` de la table `consents` devra être élargi à `('communications', 'analytics', 'diagnostics')`
- Vérification : `bash scripts/e2e-privacy.sh` et `scripts/e2e-waitlist.sql`

## Secrets

`.env` (non versionné, modèle `.env.example`) : `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_KEY` (clé publishable uniquement — jamais de service role key côté client ni dans le repo).
