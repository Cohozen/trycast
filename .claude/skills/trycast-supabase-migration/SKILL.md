---
name: trycast-supabase-migration
description: Faire évoluer le schéma Supabase de TryCast — écrire une migration SQL (tables, RLS, RPC security definer, grants), db push, régénérer les types, et vérifier en E2E. À utiliser dès qu'on touche à supabase/migrations/, une policy RLS, une RPC/fonction SQL, ou qu'on doit relancer typegen / un script e2e.
---

# TryCast — migration Supabase & RLS

Schéma **uniquement par migrations** dans `supabase/migrations/`. Jamais d'édition manuelle de `src/lib/database.types.ts` (généré).

## Workflow

1. **Créer la migration** : `supabase/migrations/AAAAMMJJ000N00_<sujet>.sql` (timestamp croissant, cf. fichiers existants `20260708000300_leagues.sql`). Un fichier = un changement cohérent ; découper table / RPC / grants / realtime en migrations séparées (comme le lot leagues : `..300_leagues`, `..400_league_rpcs`, `..500_leaderboards`, `..600_realtime_standings`).
2. **Appliquer** : `supabase db push`
3. **Régénérer les types** : `npm run typegen` (writes `database.types.ts`, projet id figé dans le script)
4. **Vérifier** : `npm run typecheck && npm run lint && npm run format:check && npm run test`
5. **E2E RLS** (voir plus bas) contre `trycast-dev`.
6. **Commit** petit et ciblé (`feat:` / `fix:`). **Jamais `git push` ni `supabase` destructif sans accord explicite de Corentin.**

## Conventions SQL (imposées par le repo)

- **En-tête de migration** en commentaire : expliquer le *pourquoi* et les pièges (récursion RLS, sécurité du code, choix MVP). Le repo est très documenté — garder ce niveau.
- **RLS = seule source de sécurité.** Toute règle (deadline prono au kickoff, visibilité des données) est une policy serveur ; le client n'est qu'une UX.
- **Écritures multi-tables / atomiques → RPC `security definer` avec `set search_path = ''`** (schémas qualifiés : `public.`, `extensions.`). Ex. `create_league` crée ligue + membership owner atomiquement, génère le code serveur via `extensions.gen_random_bytes`.
- **`errcode` explicites** dans les `raise exception` (`42501` non autorisé/non authentifié, `23514` check violé, `P0002` introuvable/pas de compétition active, `23505` unique). Ces codes doivent correspondre au `switch` de `errors.ts` du domaine côté client.
- **Piège récursion RLS** : une policy de `league_members` qui interroge `league_members`/`leagues` boucle (« infinite recursion detected in policy »). Utiliser des helpers `security definer` (`is_league_member` / `is_league_owner`) pour casser le cycle — toujours passer par eux dans les policies de ces tables.
- Contraintes miroir côté client : quand tu ajoutes un `check` (ex. nom 3-40, format code), mets à jour `validation.ts` du domaine.

## Scripts E2E (contre trycast-dev)

Chaque script re-seede son état avant exécution. Ordre de seed cumulatif : users → predictions → (scoring | leagues).

- Auth/RLS : `bash scripts/e2e-auth.sh` (seed `seed-test-users.sql`)
- Predictions : `bash scripts/e2e-predictions.sh` (seed `seed-test-predictions.sql`, **après** les users)
- Scoring : `bash scripts/e2e-scoring.sh` + `scripts/e2e-scoring.sql` côté serveur (rejouer `seed-test-scoring.sql` avant **chaque** run du `.sql`)
- Leagues : `bash scripts/e2e-leagues.sh` (rejouer `seed-test-leagues.sql` avant chaque run)
- Notifications : `bash scripts/e2e-notifications.sh` (seuls les users de test sont requis ; filtres PostgREST sur un token Expo → crochets à URL-encoder, cf. `TOKEN_ENC` dans le script)

Les scripts lisent `.env` (`EXPO_PUBLIC_SUPABASE_URL` / `_KEY`, clé publishable uniquement) et acceptent `EMAIL1/EMAIL2/PASSWORD` en override.

## Edge Functions

Dans `supabase/functions/`, déploiement `supabase functions deploy <name>`.

⚠️ **Toute EF appelée par pg_cron doit être déclarée `verify_jwt = false` dans `supabase/config.toml`** (bloc `[functions.<name>]`) **avant son premier deploy**. Par défaut la passerelle exige un JWT dans `Authorization` — or le cron n'envoie que le header `x-sync-secret` → chaque tick prend un 401 `UNAUTHORIZED_NO_AUTH_HEADER` **avant** d'atteindre le code de la fonction (vécu au Lot 6 sur `notify`, 2026-07-11 ; la protection réelle est le secret partagé vérifié dans la fonction). Diagnostic : `select status_code, content from net._http_response order by created desc` — c'est là que pg_net loge les réponses des ticks. Un deploy parti sans le bloc se corrige par un simple redeploy après ajout du bloc.

Ordre de mise en route d'une EF cron (en-têtes des migrations `20260707000300`/`20260711000300`) : `supabase secrets set <NAME>_SECRET` → bloc config.toml → `supabase functions deploy <name>` → `vault.create_secret` (même valeur) → `supabase db push` de la migration cron (jamais avant le deploy : 404 au premier tick). Les commandes `secrets set`/`functions deploy` sont bloquées par le classifieur en mode auto → les préparer et les faire exécuter par Corentin.
