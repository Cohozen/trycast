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
- **iOS** : Xcode + un simulateur iOS (macOS uniquement)
- **Android** : Android Studio + un émulateur (image ARM64 sur Apple Silicon)
- Ou l'app [Expo Go](https://expo.dev/go) sur un téléphone physique (même compte réseau non requis, scan du QR code)
- CLI optionnelles : `supabase` (migrations, typegen) et `eas-cli` (builds) — `npm install -g supabase eas-cli`

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner l'URL et la clé publishable Supabase
npx expo start
```

Depuis le terminal Metro : `i` ouvre le simulateur iOS, `a` l'émulateur Android, `w` le navigateur, `j` les React Native DevTools. Raccourcis : `npm run ios`, `npm run android`, `npm run web`.

Le projet tourne dans **Expo Go** (aucun module natif custom pour l'instant) : pas besoin de development build.

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

## Structure

```
src/
  app/            # Écrans Expo Router — (auth): login/signup/reset, (app): matchs, résultats, profil
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
- **Barème dans `src/features/scoring/`** (module TS pur, testé unitairement) : points
  vainqueur pondérés par le multiplicateur du résultat prédit (×2.0 par défaut sans cotes),
  +50 pour le score exact, volets écart, bonus défensif et offensif. L'aperçu « peut rapporter
  N pts » affiché à la saisie utilise ce même module ; l'attribution officielle des points
  (job serveur + barème versionné en base) reste à venir.

## Pipeline compétition

Les fixtures et cotes viennent de **Highlightly** (choix du fournisseur documenté dans
[docs/spike-highlightly.md](docs/spike-highlightly.md)). L'Edge Function `sync-fixtures`
les synchronise chaque nuit (05:00 UTC via pg_cron + Vault) et trace chaque run dans
`job_runs` (statut, budget API, équipes hors mapping, erreurs par compétition). Les
essais, absents du fournisseur, sont saisis manuellement après chaque match
(`scripts/admin-set-tries.sql`).

À savoir :

- **Cotes** : capturées à J-7 du kickoff, best-effort — requiert le plan Highlightly
  Pro (en Basic, `/odds` répond 401, tracé dans `job_runs.detail.odds_error` sans
  impacter les fixtures) ; le scoring a un fallback cote 2.0
- **Compétition active** : Nations Championship 2026, seedée via
  `scripts/seed-competitions.sql`

Déclenchement manuel (le secret reste dans Vault) — SQL editor :

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
2. `supabase secrets set HIGHLIGHTLY_API_KEY=<clé> SYNC_FIXTURES_SECRET=<aléatoire>`
3. `supabase functions deploy sync-fixtures`
4. Côté Postgres : `select vault.create_secret('<même valeur>', 'sync_fixtures_secret');`
5. `supabase db push` (migrations pg_cron `20260705000300` + durcissement des grants
   `20260705000400`) — jamais avant le deploy
6. Déclenchement manuel (ci-dessus), puis vérifier `teams`, `matches` et la ligne `job_runs`

## Builds (EAS)

Projet EAS initialisé. Builds et soumission aux stores : à venir dans les lots suivants (`eas build`, `eas submit`).
