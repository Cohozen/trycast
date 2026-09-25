---
name: trycast-supabase-migration
description: Faire évoluer le schéma Supabase de TryCast — écrire une migration SQL (tables, RLS, RPC security definer, grants), db push, régénérer les types, et vérifier en E2E. À utiliser dès qu'on touche à supabase/migrations/, une policy RLS, une RPC/fonction SQL, ou qu'on doit relancer typegen / un script e2e. Couvre aussi l'import des essais (EF sync-tries, Wikipedia, saisie admin), la surveillance des crons (moniteur Sentry cron-health, lire une alerte) et le piège des content_path de config.toml.
---

# TryCast — migration Supabase & RLS

Schéma **uniquement par migrations** dans `supabase/migrations/`. Jamais d'édition manuelle de `apps/mobile/src/lib/database.types.ts` (généré).

## Workflow

1. **Créer la migration** : `supabase/migrations/AAAAMMJJ000N00_<sujet>.sql` (timestamp croissant, cf. fichiers existants `20260708000300_leagues.sql`). Un fichier = un changement cohérent ; découper table / RPC / grants / realtime en migrations séparées (comme le lot leagues : `..300_leagues`, `..400_league_rpcs`, `..500_leaderboards`, `..600_realtime_standings`).
2. **Appliquer** : `supabase db push`
3. **Régénérer les types** : `npm run typegen` à la racine (écrit `apps/mobile/src/lib/database.types.ts`, projet déduit d'`apps/mobile/.env`)
4. **Vérifier** : `npm run verify` à la racine (formatage, tests des Edge Functions, typecheck, lint et tests de l'app)
5. **E2E RLS** (voir plus bas) contre `trycast-dev`.
6. **Commit** petit et ciblé (`feat:` / `fix:`). **Jamais `git push` ni `supabase` destructif sans accord explicite de Corentin.**

## Conventions SQL (imposées par le repo)

- **En-tête de migration** en commentaire : expliquer le *pourquoi* et les pièges (récursion RLS, sécurité du code, choix MVP). Le repo est très documenté — garder ce niveau.
- **RLS = seule source de sécurité.** Toute règle (deadline prono au kickoff, visibilité des données) est une policy serveur ; le client n'est qu'une UX.
- **Écritures multi-tables / atomiques → RPC `security definer` avec `set search_path = ''`** (schémas qualifiés : `public.`, `extensions.`). Ex. `create_league` crée ligue + membership owner atomiquement, génère le code serveur via `extensions.gen_random_bytes`.
- **`errcode` explicites** dans les `raise exception` (`42501` non autorisé/non authentifié, `23514` check violé, `P0002` introuvable/pas de compétition active, `23505` unique). Ces codes doivent correspondre au `switch` de `errors.ts` du domaine côté client.
- **Piège récursion RLS** : une policy de `league_members` qui interroge `league_members`/`leagues` boucle (« infinite recursion detected in policy »). Utiliser des helpers `security definer` (`is_league_member` / `is_league_owner`) pour casser le cycle — toujours passer par eux dans les policies de ces tables.
- Contraintes miroir côté client : quand tu ajoutes un `check` (ex. nom 3-40, format code), mets à jour `validation.ts` du domaine.

## Piège : changer une contrainte d'unicité qu'une EF vise en `onConflict`

Vécu le 2026-09-22 (`notification_sends`, passée de `(user_id, match_id, type)` à `(user_id, match_id, type, league_id)` **nulls not distinct**). Un upsert PostgREST `onConflict: 'a,b,c'` exige une contrainte sur **exactement** ces colonnes. Dès le `db push`, l'EF déjà déployée échoue donc à chaque appel (42P10), et une EF déployée avant la migration échoue pareil. Il faut enchaîner **migration puis deploy immédiat**, en le disant dans la procédure de prod. Un index unique **partiel** est inutilisable ici, faute de pouvoir passer le prédicat par PostgREST. `nulls not distinct` (PG 15+) permet d'ajouter une colonne nullable à la clé sans casser la déduplication des lignes où elle vaut null.

## Vues

Une vue destinée aux **clients** n'est presque jamais la bonne réponse : préférer une **RPC** (une vue `security definer` déclenche l'advisor ERROR `security_definer_view`, cf. `get_prediction_distributions`).

Pour une vue d'**outillage** (lue depuis le SQL editor ou par `service_role`), deux réflexes obligatoires — modèle : `admin_matches_pending_tries`, migration `20260723000100` :

- `create view … with (security_invoker = on)` : sans ça la vue est « security definer » au sens de l'advisor. Sans effet pratique quand seuls `postgres` et `service_role` la lisent, mais on ne laisse pas traîner une vue privilégiée dans `public`.
- **Les default privileges legacy s'appliquent aux vues comme aux tables** sur le projet dev : sans `revoke all … from anon, authenticated`, la vue est lisible par toute l'app. Le `grant select … to service_role` explicite complète le durcissement.

Une fonction d'outillage réservée à `service_role` n'a **pas besoin d'être `security definer`** : `service_role` a déjà `grant all` sur les tables métier. Rester en invoker évite de créer une élévation de privilège tant qu'aucun client n'est à autoriser (`admin_set_match_tries`). Ne pas oublier le `revoke execute … from public, anon, authenticated` : une fonction naît exécutable par `public`.

## Storage (buckets & policies)

- Bucket via `insert into storage.buckets (id, name, public) values (...) on conflict do nothing;` — passe bien en `db push` (contrairement à la crainte fréquente ; les policies sur `storage.objects` aussi, testé le 2026-07-13 sur `avatars`).
- Policies cloisonnées par utilisateur : `(storage.foldername(name))[1] = (select auth.uid())::text` (chemin `<userId>/fichier`).
- ⚠️ **Piège upsert/remove (débogué 2026-07-13)** : l'API Storage fait un **SELECT d'existence sous la RLS de l'utilisateur** avant un upload `upsert: true` **et** avant un `remove`. Sans policy **SELECT** « son propre dossier », l'API renvoie `403 "new row violates row-level security policy"` (HTTP 400) — **alors même que les policies INSERT/UPDATE sont correctes** et qu'un INSERT SQL direct sous le même JWT passe. Donc pour un avatar à chemin stable (upsert) : prévoir les 4 policies insert/update/delete/**select**. La lecture publique (bucket `public=true`) passe, elle, par l'URL CDN et court-circuite la RLS — la policy SELECT ne sert qu'aux écritures de l'utilisateur. E2E : `scripts/e2e-avatars.sh`.
- Suppression directe interdite (`delete from storage.objects` → `storage.protect_delete()`), passer par l'API Storage.

## Scripts E2E (contre trycast-dev)

Chaque script re-seede son état avant exécution. Ordre de seed cumulatif : users → predictions → (scoring | leagues).

- Auth/RLS : `bash scripts/e2e-auth.sh` (seed `seed-test-users.sql`)
- Predictions : `bash scripts/e2e-predictions.sh` (seed `seed-test-predictions.sql`, **après** les users)
- Scoring : `bash scripts/e2e-scoring.sh` + `scripts/e2e-scoring.sql` côté serveur (rejouer `seed-test-scoring.sql` avant **chaque** run du `.sql`)
- Leagues : `bash scripts/e2e-leagues.sh` (rejouer `seed-test-leagues.sql` avant chaque run)
- Notifications : `bash scripts/e2e-notifications.sh` (seuls les users de test sont requis ; filtres PostgREST sur un token Expo → crochets à URL-encoder, cf. `TOKEN_ENC` dans le script)

- Coup de la journée : `supabase db query --linked -f scripts/e2e-round-highlights.sql`, **sans seed**. Modèle à reprendre pour un calcul SQL : tout dans une transaction terminée par `rollback`, données créées sur place (users dans `auth.users`, compétition, ligue, matchs), petites fonctions `pg_temp.*` pour les assertions (`raise exception` qui nomme le cas), et une ligne « OK » en sortie. La garde d'appartenance d'une RPC se teste dans la même transaction : `set_config('request.jwt.claims', …, true)` puis `set local role authenticated`, et `reset role` avant d'asserter (les fonctions `pg_temp` ne sont pas exécutables par `authenticated`). Faire tourner une copie **faussée** au moins une fois : un script qui ne sait pas échouer ne prouve rien.
- Rang d'avant journée : `supabase db query --linked -f scripts/e2e-previous-rank.sql`, **sans seed**, même modèle (agrégat, départage, comptes de démo exclus, frontière `p_before`, rang de l'appelant seul). ⚠️ `get_my_previous_rank` recopie les critères du classement : toucher au départage de `apply_match_scores` impose de la modifier aussi (skill `trycast-regles-metier`).

Les scripts lisent `.env` (`EXPO_PUBLIC_SUPABASE_URL` / `_KEY`, clé publishable uniquement) et acceptent `EMAIL1/EMAIL2/PASSWORD` en override.

## Pousser une migration en prod (geste de Corentin)

Procédure complète, refs des projets et commandes à donner à Corentin : skill **`trycast-prod-rollout`**.
Un agent ne pousse jamais en prod lui-même.

## Exécuter du SQL sur le dev

⚠️ **Le MCP Supabase (`execute_sql`) est en lecture seule** (constaté le 2026-09-15 : `25006 cannot execute UPDATE in a read-only transaction`). Il sert aux constats ; pour écrire (seed, données de test, secret Vault), passer par la CLI sur le projet lié :

- `supabase db query --linked "<sql>"`, ou `-f fichier.sql` ;
- vérifier d'abord que le projet lié est le dev : `cat supabase/.temp/project-ref` doit correspondre à l'URL du `.env` ;
- un secret (Vault, par exemple) va dans un fichier `-f` créé sous `umask 077` puis supprimé, jamais en argument de commande.
- ⚠️ En mode auto, le classifieur refuse **toute écriture de secret Vault** par l'agent, même sur le dev (« Secret-Store Writes », vécu le 2026-09-25 avec `sentry_cron_checkin_url`) : préparer le fichier et la commande, c'est Corentin qui la lance.

## Surveillance des crons : moniteur Sentry `cron-health`

Le job pg_cron `cron-health` (`30 * * * *`, migration `20260925000100_cron_health.sql`) appelle `public.report_cron_health()`, qui fait le bilan de l'heure écoulée et envoie un check-in `ok` ou `error` au moniteur Sentry Crons `cron-health` (créé et tenu à jour par le `monitor_config` du check-in, rien à régler dans Sentry hors l'alerte). L'heure est en erreur si un job de `cron.job_run_details` a échoué, si les appels HTTP de `net._http_response` ont **plus échoué que réussi**, ou si un job n'a écrit **que des erreurs** dans `job_runs`. Quelques 500 isolés (« JWT issued at future », plateforme) restent du bruit, exprès. Un check-in **manquant** alerte aussi : secret absent, pg_cron arrêté ou fonction cassée.

- **Lire une alerte** : dans le SQL editor du projet concerné, `select public.report_cron_health();` renvoie le bilan (`cron_failed`, `http_ok`, `http_failed`, `jobs_down`). Elle envoie un check-in de plus, sans conséquence. Le détail se lit ensuite dans `cron.job_run_details`, `net._http_response` et `job_runs`.
- La fonction est fermée à `public`, `anon` et `authenticated` : outillage seul, jamais appelée par l'app.
- Secret `sentry_cron_checkin_url`, **un par projet**, déduit du DSN public de l'app (`https://<clé>@o<org>.ingest.de.sentry.io/<projet>`) : `https://o<org>.ingest.de.sentry.io/api/<projet>/cron/cron-health/<clé>/?environment=production`, `environment=development` sur le dev. Commande dans l'en-tête de la migration.
- L'alerte e-mail se règle côté Sentry sur l'environnement **`production` seul** : le dev est souvent en `error` (quota Highlightly épuisé l'après-midi, 429 sur `sync-live` et `sync-results`), c'est attendu.
- Le check-in ne porte qu'un statut : ni compteur ni donnée d'utilisateur ne sort. Ne pas y ajouter le bilan sans repasser par `docs/rgpd/`.

## Edge Functions

Dans `supabase/functions/`, déploiement `supabase functions deploy <name>`.

- Pas de Deno sur la machine, et `supabase/functions` est exclu de `tsc` et d'eslint : seule la logique pure (`transform.ts`, testée sous Vitest) est vérifiée localement. Les erreurs d'`index.ts` n'apparaissent qu'au déploiement ou à l'appel. Garder `index.ts` mince et **l'appeler réellement sur le dev** après déploiement.
- EF de cron : secret d'appel dans les secrets EF (`supabase secrets set`) **et** dans Vault sous la même valeur, avant la migration `cron.schedule` (modèle : `20260915000200_schedule_sync_tries.sql`).

⚠️ **Toute EF appelée par pg_cron doit être déclarée `verify_jwt = false` dans `supabase/config.toml`** (bloc `[functions.<name>]`) **avant son premier deploy**. Par défaut la passerelle exige un JWT dans `Authorization` — or le cron n'envoie que le header `x-sync-secret` → chaque tick prend un 401 `UNAUTHORIZED_NO_AUTH_HEADER` **avant** d'atteindre le code de la fonction (vécu au Lot 6 sur `notify`, 2026-07-11 ; la protection réelle est le secret partagé vérifié dans la fonction). Diagnostic : `select status_code, content from net._http_response order by created desc` — c'est là que pg_net loge les réponses des ticks. Un deploy parti sans le bloc se corrige par un simple redeploy après ajout du bloc.

Ordre de mise en route d'une EF cron (en-têtes des migrations `20260707000300`/`20260711000300`) : `supabase secrets set <NAME>_SECRET` → bloc config.toml → `supabase functions deploy <name>` → `vault.create_secret` (même valeur) → `supabase db push` de la migration cron (jamais avant le deploy : 404 au premier tick). Les commandes `secrets set`/`functions deploy` sont bloquées par le classifieur en mode auto → les préparer et les faire exécuter par Corentin.

## Essais : import Wikipedia, saisie admin en repli

Aucun fournisseur ne publie les essais. Le cron `sync-tries-30min` (EF `sync-tries`) lit les
encadrés `{{rugbybox}}` des pages listées dans `competitions.wikipedia_pages` et **n'écrit que si
le décompte reconstitue le score Highlightly** — ne jamais assouplir ce contrôle, c'est lui qui
rend une source tenue par des bénévoles exploitable. Écriture par la même RPC que la saisie
manuelle.

- Une nouvelle compétition passe d'abord par le mode `audit` de l'EF (le format des pages varie :
  la RWC 2023 n'a pas de `{{rugbybox}}`).
- Scraper L'Équipe/Flashscore a été écarté (CGU, droit des bases de données) — ne pas le reproposer.
- Repli : vue `admin_matches_pending_tries` pour voir ce qui reste à faire et RPC
  `admin_set_match_tries(api_game_id, domicile, extérieur)` pour saisir — réservées à
  `service_role`, depuis le SQL editor Supabase (`scripts/admin-set-tries.sql`, dont la requête des
  rejets de l'import).

## Piège `db push` : les `content_path` de `config.toml`

Dans `supabase/config.toml`, les `content_path` de `[auth.email.template.*]` sont relatifs à la
**racine du projet** (`./supabase/templates/…`) alors que ceux de `[auth.email.notification.*]` le
sont au **dossier `supabase/`** (`./templates/…`). Aligner les deux blocs sur la même forme fait
échouer `supabase db push` à la validation de la config, avant toute écriture.
