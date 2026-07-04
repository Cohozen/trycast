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
- Textes UI et messages d'erreur **en français**
- Logique de scoring : module TS pur testable unitairement + écriture atomique via une seule RPC SQL (décision actée, ne pas re-débattre)
- **Un composant par fichier, un fichier par composant** (fichier nommé comme le composant, en kebab-case)
- Tout composant réutilisable va dans `src/components/` (primitives UI dans `src/components/ui/`) ; un composant propre à un domaine reste dans `src/features/<domaine>/components/`
- Types partagés dans des fichiers dédiés : `src/features/<domaine>/types.ts` par domaine (pas de fourre-tout global) ; les props d'un composant restent colocalisées avec lui tant qu'elles ne sont pas réutilisées ailleurs
- Styles : classes NativeWind inline dans le JSX (`className`) ; dès qu'un style se répète, extraire un composant partagé ou un variant dans `src/tw/` — pas de `StyleSheet.create` sauf impossibilité Tailwind

## Git

- Commits petits et fréquents : un commit = un changement cohérent (config ≠ reformatage ≠ feature), messages `type: description`
- **Jamais de `git push` sans autorisation explicite de Corentin**

## Supabase

- Projet dev `trycast-dev`, lié via `supabase link` (l'id du projet se retrouve avec `supabase projects list`)
- Schéma : uniquement par migrations dans `supabase/migrations/`, puis `supabase db push` + `npm run typegen`
- Toute règle de sécurité (deadline prono au kickoff, accès données) est imposée par RLS côté serveur, le client n'est qu'une UX
- Edge Functions dans `supabase/functions/`, déploiement `supabase functions deploy <name>`
- Vérification E2E auth/RLS : `bash scripts/e2e-auth.sh` (utilisateurs de test : `scripts/seed-test-users.sql`)

## Secrets

`.env` (non versionné, modèle `.env.example`) : `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_KEY` (clé publishable uniquement — jamais de service role key côté client ni dans le repo).
