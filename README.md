# TryCast 🏉

Application mobile de pronostics rugby entre amis. Cible : Coupe du monde 2027, soft-launch sur le 6 Nations 2027.

Pronostic unique par match (score exact + bonus offensifs), points pondérés par les cotes bookmaker, classements par ligue et général. 100 % gratuit et social.

## Stack

- **App** : [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) / React Native 0.86 / TypeScript, routing par fichiers avec [Expo Router](https://docs.expo.dev/router/introduction/)
- **Styling** : [NativeWind v5](https://www.nativewind.dev/) (Tailwind CSS v4)
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

## Structure

```
src/
  app/            # Écrans Expo Router — (auth): login/signup/reset, (app): app connectée
  components/     # Composants UI partagés
  features/       # Logique par domaine (auth, profile…) + tests colocalisés
  lib/            # Client Supabase typé, stockage session chiffré, React Query
  hooks/ constants/ tw/
supabase/
  migrations/     # Migrations SQL (source de vérité du schéma)
  functions/      # Edge Functions (delete-account)
scripts/          # Seeds de test, script E2E
```

## Backend Supabase

Projet dev : `trycast-dev` (`bmdzadvugtkclnqjpndr`, eu-west-3). Workflow :

1. Nouvelle migration dans `supabase/migrations/`, appliquée via `supabase db push` (projet lié avec `supabase link`)
2. `npm run typegen` pour mettre à jour les types TS
3. Edge Functions déployées avec `supabase functions deploy <name>`

La sécurité (deadlines de pronostic, accès aux données) est imposée côté serveur par RLS — jamais uniquement côté client.

## Builds (EAS)

Projet EAS initialisé (owner `cohozen`). Builds et soumission aux stores : à venir dans les lots suivants (`eas build`, `eas submit`).
