---
name: trycast-prod-rollout
description: Préparer pour Corentin la procédure de mise en production du backend Supabase de TryCast — migrations (db push), seeds de données de référence, secrets Vault, Edge Functions — avec les commandes prêtes à copier, les refs des projets prod et dev, le dry-run, le retour obligatoire sur le dev et les requêtes de contrôle. À utiliser dès qu'un lot a ajouté des fichiers dans supabase/migrations/, modifié une Edge Function ou un seed de référence, ou que Corentin demande « les commandes pour passer en prod ».
---

# TryCast — passer le backend en production

**La prod est un geste de Corentin, jamais d'un agent** (même en lecture). L'agent **prépare** la
procédure et la lui donne ; il n'exécute rien contre la prod. Le `git push` aussi est à lui.

## Les deux projets

| Projet | Ref | Rôle |
|---|---|---|
| `trycast-prod` | `bmdzadvugtkclnqjpndr` | vrais comptes, touché par Corentin seulement |
| dev | `axxutfngespcdiqtrdao` | celui du `.env`, des scripts et des agents |

Source : « Décisions clés » de `DASHBOARD.md` (le ref prod est l'ancien projet de dev, renommé). Le ref dev
se relit dans `apps/mobile/.env` (`EXPO_PUBLIC_SUPABASE_URL`). **Jamais de ref en dur dans une
migration ou un script** (règle d'AGENTS.md) : ce tableau ne sert qu'aux commandes données à la main.

## Préparer la procédure (côté agent)

Avant de rédiger, établir **exactement** ce qui part :

1. **Migrations** : lister celles du lot (`git log --name-only` sur `supabase/migrations/`). Ce sont
   elles que le dry-run doit afficher, ni plus ni moins.
2. **Secrets Vault** : `grep -l "vault" ` sur ces migrations. Si l'une lit un secret, il faut le créer
   en prod **avant** le push (liste des secrets connus dans AGENTS.md, section Supabase).
3. **Seeds de référence** : un lot qui ajoute des données dont le schéma dépend (phases de compétition,
   compétitions, barème…) doit dire quel seed rejouer. Vérifier qu'il est **idempotent** (upsert) avant
   de le proposer en prod. Les seeds `seed-test-*.sql` sont **réservés au dev**.
4. **Edge Functions** : celles modifiées depuis le dernier déploiement prod
   (`git diff --stat <dernier tag ou commit déployé> -- supabase/functions/`). Une modification de
   `_shared/` concerne toutes les fonctions qui l'importent.
5. **Contrainte visée par une EF** : si une migration change une contrainte d'unicité qu'une EF utilise en `onConflict`, l'EF en place casse dès le push. Donner le deploy **juste après** le push, entre deux ticks du cron concerné, et le signaler en tête (cf. skill `trycast-supabase-migration`).
6. **Config EF** : une EF appelée par pg_cron doit être en `verify_jwt = false` dans
   `supabase/config.toml` avant son premier deploy (cf. skill `trycast-supabase-migration`).

Puis donner la procédure ci-dessous, **une commande par bloc `bash`**, en retirant les étapes sans
objet et en nommant les fichiers attendus au dry-run.

## Procédure à donner à Corentin (depuis la racine du dépôt)

**0. Secrets Vault** (si une migration en lit un). Dans le SQL editor prod :
```sql
select name from vault.secrets;
```
Le secret manquant se crée dans le SQL editor prod (`select vault.create_secret('<valeur>', '<nom>');`),
jamais en argument de commande. Oublier `edge_functions_base_url` a coupé **tous les crons prod du
2026-08-15 au 2026-09-15**, sans aucune alerte.

**1. Lier la CLI à la prod**
```bash
supabase link --project-ref bmdzadvugtkclnqjpndr
```

**2. Dry-run** : la liste doit contenir **exactement** les migrations du lot. S'il y en a d'autres,
s'arrêter : la prod a du retard sur un lot précédent.
```bash
supabase db push --dry-run
```

**3. Pousser**
```bash
supabase db push
```

**4. Seeds de référence** (si le lot en a), sur le projet lié :
```bash
supabase db query --linked -f scripts/<seed>.sql
```

**5. Edge Functions** modifiées, une commande par fonction :
```bash
supabase functions deploy <nom> --project-ref bmdzadvugtkclnqjpndr
```

**6. Relier le dev AUSSITÔT** — sinon le prochain `db push` d'un agent part en prod :
```bash
supabase link --project-ref axxutfngespcdiqtrdao
```
```bash
cat supabase/.temp/project-ref
```
Doit afficher `axxutfngespcdiqtrdao`.

**7. Contrôles** dans le SQL editor prod : la requête propre au lot (ex. les lignes seedées), puis les
crons :
```sql
select jobname, status, start_time from cron.job_run_details d join cron.job j using (jobid) order by start_time desc limit 10;
```

**8.** `git push`.

## À dire en accompagnement

- Si l'app distribuée n'appelle pas encore le nouveau schéma, le préciser : les migrations sont **sans
  effet pour les testeurs** jusqu'au build qui s'en sert. À l'inverse, une migration qui **retire ou
  renomme** ce qu'un build distribué utilise casse ce build : la signaler en tête, avant toute commande.
- Une Edge Function appelée à la main en prod sans sortir son secret de la base :
  `select net.http_post(...)` avec l'URL et le secret lus dans `vault.decrypted_secrets` (même corps
  que les migrations de planification), puis
  `select status_code, content from net._http_response order by created desc limit 1`.

## Après le passage

Quand Corentin confirme, vérifier que le dev est bien relié (`cat supabase/.temp/project-ref`), que
`git status -sb` est à jour avec `origin/main`, puis mettre `DASHBOARD.md` à jour (« en prod côté
serveur », date, ce qui reste à faire).
