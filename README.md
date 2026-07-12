# TryCast 🏉

Application mobile de pronostics rugby entre amis. Cible : Coupe du monde 2027, soft-launch sur le 6 Nations 2027.

Pronostic unique par match (score exact + bonus offensifs), points pondérés par les cotes bookmaker, classements par ligue et général. 100 % gratuit et social.

## Stack

- **App** : [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) / React Native 0.86 / TypeScript, routing par fichiers avec [Expo Router](https://docs.expo.dev/router/introduction/)
- **Styling** : [NativeWind v5](https://www.nativewind.dev/) (Tailwind CSS v4) — override npm : `lightningcss` épinglé en 1.30.1 pour `react-native-css`, sinon crash au bundling natif sur les `var()` externes (ex. CSS de `@expo/log-box`)
- **Backend** : [Supabase](https://supabase.com) (Postgres + RLS, Auth email/mot de passe, Edge Functions)
- **Data fetching** : TanStack Query
- **Tests** : Vitest (logique pure), script E2E auth/RLS
- **CI** : GitHub Actions (lint, format, typecheck, tests)

## Prérequis

- Node.js ≥ 20 et npm
- **iOS** : Xcode + CocoaPods (`brew install cocoapods`) + un simulateur iOS (macOS uniquement)
- **Android** : Android Studio + un émulateur (image ARM64 sur Apple Silicon)
- CLI optionnelles : `supabase` (migrations, typegen) et `eas-cli` (builds cloud) — `npm install -g supabase eas-cli`

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner l'URL et la clé publishable Supabase
npm run ios            # ou npm run android
```

Le projet embarque `expo-dev-client` : l'app tourne dans un **development build local** (pas dans Expo Go). `npm run ios` (`expo run:ios`) et `npm run android` (`expo run:android`) compilent le client de dev natif, l'installent sur le simulateur/émulateur et démarrent Metro. La **première** compilation prend quelques minutes (prebuild + CocoaPods/Gradle) ; ensuite `npm start` (`expo start`) suffit pour relancer Metro et rouvrir l'app déjà installée (`w` ouvre le web, `j` les React Native DevTools). Les dossiers natifs `/ios` et `/android` sont régénérés à la volée par le prebuild et **non versionnés**.

Les **notifications push** nécessitent ce dev build (elles sont retirées d'Expo Go depuis le SDK 53) et un **appareil physique** : sur simulateur/émulateur, l'app détecte l'absence de contexte push et saute simplement l'enregistrement du token. Pour un dev build installable sur téléphone (distribution interne), passer par EAS :

```bash
npx eas-cli build --profile development --platform android   # APK à installer (QR code)
npx eas-cli build --profile development --platform ios       # build simulateur (iOS device = compte Apple Developer requis, Lot 7)
```

Le build Android embarque l'identité Firebase (FCM) de l'app : le fichier `google-services.json` n'est pas versionné, il vit à la racine en local et dans l'env EAS `GOOGLE_SERVICES_JSON` pour les builds cloud. Un push de test peut s'envoyer à la main depuis [expo.dev/notifications](https://expo.dev/notifications) avec le token affiché dans les logs Metro.

## Scripts

| Commande                          | Rôle                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `npm run test`                    | Tests unitaires Vitest                                                         |
| `npm run typecheck`               | `tsc --noEmit`                                                                 |
| `npm run lint`                    | ESLint (config Expo, règles stylistiques désactivées)                          |
| `npm run format` / `format:check` | Biome (formatage : 4 espaces, 100 colonnes)                                    |
| `npm run typegen`                 | Régénère `src/lib/database.types.ts` depuis le schéma Supabase                 |
| `bash scripts/e2e-auth.sh`        | Vérification E2E auth + RLS contre le projet Supabase (voir en-tête du script) |
| `bash scripts/e2e-predictions.sh` | Vérification E2E RLS des pronostics (deadline kickoff, colonnes de points)     |
| `bash scripts/e2e-scoring.sh`     | Vérification E2E du scoring côté client (barème lisible, RPC verrouillée)      |

## Structure

```
src/
  app/            # Écrans Expo Router — (auth): login/signup/reset, (app): onglets (matchs, résultats, classement, ligues, profil) + écrans ligue
  components/     # Composants UI partagés
  features/       # Logique par domaine (auth, profile, matches, predictions, scoring…) + tests colocalisés
  lib/            # Client Supabase typé, stockage session chiffré, React Query
  hooks/ constants/ tw/
supabase/
  migrations/     # Migrations SQL (source de vérité du schéma)
  functions/      # Edge Functions (delete-account, sync-fixtures) — logique pure testée sous Vitest
scripts/          # Seeds (compétitions, users/matchs de test), saisie admin des essais, scripts E2E
docs/             # Notes de décision (choix du fournisseur de données…)
```

## Backend Supabase

Le projet dev est lié en local via `supabase link`. Workflow :

1. Nouvelle migration dans `supabase/migrations/`, appliquée via `supabase db push` (projet lié avec `supabase link`)
2. `npm run typegen` pour mettre à jour les types TS
3. Edge Functions déployées avec `supabase functions deploy <name>`

La sécurité (deadlines de pronostic, accès aux données) est imposée côté serveur par RLS — jamais uniquement côté client.

## Pronostics

Un pronostic par joueur et par match : score exact + case « bonus offensif » (4 essais ou plus)
par équipe. La saisie se fait dans l'onglet **Matchs** (matchs à venir, du plus proche au plus
lointain) ; l'onglet **Résultats** montre le score réel, le prono et les points obtenus.

- **Deadline au coup d'envoi, imposée par RLS** : après le kickoff, Postgres refuse toute
  écriture, quelle que soit l'UI. Les colonnes de points ne sont accordées qu'au rôle serveur
  (grants par colonne) — un client ne peut pas s'attribuer de points.
- **Barème dans `supabase/functions/_shared/scoring/`** (module TS pur, testé unitairement,
  ré-exporté vers l'app par `src/features/scoring/`) : points vainqueur pondérés par le
  multiplicateur du résultat prédit (×2.0 par défaut sans cotes), +50 pour le score exact,
  volets écart, bonus défensif et offensif. L'aperçu « peut rapporter N pts » affiché à la
  saisie utilise ce même module ; l'attribution officielle passe par le job serveur
  (voir §Scoring) avec le barème versionné en base (`scoring_rules`).

## Scoring

L'Edge Function `sync-results` tourne toutes les 10 minutes (pg_cron) et sort
immédiatement — sans écriture ni appel API — si aucun match ne l'attend. Sinon elle :

1. récupère les scores des matchs joués (1 appel Highlightly par compétition active) ;
2. **passe 1** : dès qu'un match est terminé avec un score, calcule les points de tous
   ses pronos (module TS pur) et les écrit en une transaction via la RPC
   `apply_match_scores` (service_role uniquement, idempotente). Les bonus offensifs des
   pronos restent « en attente » tant que les essais ne sont pas saisis ;
3. **passe 2** : après la saisie admin des essais (`scripts/admin-set-tries.sql`), le
   tick suivant re-score le match — seuls les bonus offensifs s'ajoutent.

Garde-fous : un match sans résultat 48 h après son coup d'envoi passe en
`needs_review` (correction manuelle, exclu du scoring en attendant) ; chaque run utile
est tracé dans `job_runs`.

## Ligues & classements

Chaque joueur a un total de points par compétition dans `standings`, recalculé par
`apply_match_scores` à chaque scoring (recalcul complet, jamais d'incrément — rejouable
sans risque). Cette unique table sert les deux classements, via deux RPC qui portent le
tri et les égalités (points, puis scores exacts, puis moins de pronos) :

- **Classement** (général) : tous les joueurs de la compétition (`get_global_leaderboard`) ;
- **Ligues** : classement d'une ligue = ses membres croisés avec `standings`
  (`get_league_leaderboard`). Rejoindre une ligue en cours crédite donc automatiquement
  les points déjà marqués.

Les ligues sont privées : visibles de leurs seuls membres (RLS), on les rejoint
uniquement par code d'invitation à 8 caractères via la RPC `join_league` — le code n'est
jamais résoluble par une requête directe, donc pas d'énumération possible. La création
passe par `create_league` (code généré côté serveur, créateur membre d'office). Le
créateur peut renommer, exclure un membre ou supprimer sa ligue ; un membre peut la
quitter. Le partage du code passe par la feuille de partage du téléphone.

L'app s'abonne aux changements de `standings` (Realtime) : les classements se
rafraîchissent seuls quand le scoring passe.

## Pipeline compétition

Les fixtures et cotes viennent de **Highlightly** (choix du fournisseur documenté dans
[docs/spike-highlightly.md](docs/spike-highlightly.md)). Deux Edge Functions se partagent
le travail (client API commun dans `supabase/functions/_shared/highlightly.ts`) :

- **`sync-fixtures`** (chaque nuit, 05:00 UTC) : fixtures, équipes et capture des cotes ;
- **`sync-results`** (toutes les 10 min, early-exit hors jours de match) : scores des
  matchs joués + scoring (voir §Scoring).

Chaque run utile est tracé dans `job_runs` (statut, budget API, équipes hors mapping,
erreurs par compétition). Les essais, absents du fournisseur, sont saisis manuellement
après chaque match (`scripts/admin-set-tries.sql`) — la passe 2 du scoring s'en charge
au tick suivant.

À savoir :

- **Cotes** : capturées à J-7 du kickoff, best-effort — requiert le plan Highlightly
  Pro (en Basic, `/odds` répond 401, tracé dans `job_runs.detail.odds_error` sans
  impacter les fixtures) ; le scoring a un fallback cote 2.0
- **Compétition active** : Nations Championship 2026, seedée via
  `scripts/seed-competitions.sql`

Déclenchement manuel (le secret reste dans Vault) — SQL editor, en remplaçant le nom de
la fonction et de son secret (`sync-fixtures`/`sync_fixtures_secret` ou
`sync-results`/`sync_results_secret`) :

```sql
select net.http_post(
  url := 'https://<projet>.supabase.co/functions/v1/sync-fixtures',
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-secret',
    (select decrypted_secret from vault.decrypted_secrets where name = 'sync_fixtures_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 30000);
```

Mise en route sur un nouveau projet (ordre important, secrets jamais dans le repo) :

1. Relever les `leagueId` (`GET /leagues?leagueName=…` avec la clé Highlightly), compléter
   et exécuter `scripts/seed-competitions.sql`
2. `supabase secrets set HIGHLIGHTLY_API_KEY=<clé> SYNC_FIXTURES_SECRET=<aléatoire> SYNC_RESULTS_SECRET=<aléatoire>`
3. `supabase functions deploy sync-fixtures && supabase functions deploy sync-results`
4. Côté Postgres : `select vault.create_secret('<même valeur>', 'sync_fixtures_secret');`
   puis idem pour `sync_results_secret`
5. `supabase db push` (migrations pg_cron `20260705000300`/`20260707000300` + durcissement
   des grants `20260705000400`) — jamais avant le deploy
6. Déclenchement manuel (ci-dessus), puis vérifier `teams`, `matches` et la ligne `job_runs`

## Builds (EAS)

Projet EAS initialisé. Builds et soumission aux stores : à venir dans les lots suivants (`eas build`, `eas submit`).
