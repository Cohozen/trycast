# `scripts/` — outillage du projet

Scripts d'exploitation : génération et déploiement des e-mails, vérifications E2E contre Supabase, seeds de données de test.

**Tout ce dossier vise le projet `trycast-dev`.** Aucun script n'est prévu pour la production. Les identifiants viennent de `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` — clé publishable uniquement, jamais de service role key).

---

## E-mails d'auth

| Commande | Effet |
|---|---|
| `npm run emails:build` | Régénère `supabase/templates/*.html` |
| `npm run emails:check` | Échoue si un template a dérivé, ou si les sujets de `config.toml` ne correspondent plus |
| `npm run emails:push -- --dry-run` | Affiche le diff avec la config en ligne, n'écrit rien |
| `npm run emails:push` | Pousse sujets, contenus, `mailer_otp_length` et les 2 notifications de sécurité |

### `build-email-templates.mjs`

**Source unique des 7 e-mails d'auth.** Ne jamais éditer `supabase/templates/*.html` à la main : ils sont générés. Le script porte aussi les sujets et les clés GoTrue de chaque template.

Les contraintes du HTML d'e-mail (styles inline, tables, tokens du DS en hex, polices non chargées) sont documentées en tête du fichier et dans le skill `trycast-emails`.

### `push-email-config.mjs`

Pousse la config e-mail via l'**API Management**, pas via `supabase config push`.

Deux raisons : `config push` pousse toute la configuration du projet sans dry-run — un `config.toml` désaligné débranche le SMTP Resend — et il échoue aujourd'hui sur ce projet en lisant la config Storage distante (`SchemaError(Missing key at ["databasePoolMode"])`, décalage CLI 2.106 / plateforme). Ce script n'envoie que les champs e-mail, affiche le diff avant d'écrire, et **relit la config après le PATCH** au lieu de se fier au code retour.

```bash
export SUPABASE_ACCESS_TOKEN='sbp_...'   # https://supabase.com/dashboard/account/tokens
npm run emails:push -- --dry-run
```

---

## Vérifications E2E

Scripts bash rejouables qui tapent l'API Supabase avec de vrais JWT pour vérifier que **les règles de sécurité tiennent côté serveur** (RLS, RPC verrouillées), pas seulement dans l'UI.

Tous prennent les mêmes variables :

```bash
EMAIL1=e2e.user1@trycast.local EMAIL2=e2e.user2@trycast.local PASSWORD=motdepasse123 \
  bash scripts/e2e-auth.sh
```

| Script | Couvre | Seed requis |
|---|---|---|
| `e2e-auth.sh` | Auth et profils, isolation par user | `seed-test-users.sql` |
| `e2e-avatars.sh` | Policies Storage « son propre dossier », `profiles.avatar_url` | `seed-test-users.sql` |
| `e2e-predictions.sh` | RLS des pronostics, deadline au coup d'envoi | + `seed-test-predictions.sql` |
| `e2e-scoring.sh` | Barème lisible mais inviolable, `apply_match_scores` verrouillée | + `seed-test-scoring.sql` |
| `e2e-leagues.sh` | Invisibilité aux non-membres, anti-énumération, quitter/exclure | + `seed-test-leagues.sql` |
| `e2e-notifications.sh` | Tokens push par RPC, isolation des préférences | `seed-test-users.sql` |
| `e2e-privacy.sh` | `consents` append-only, Edge Function `export-data` | `seed-test-users.sql` |
| `e2e-email.sh` | Transport SMTP Resend | aucun |

⚠️ **`e2e-email.sh` envoie de vrais e-mails et crée des comptes**, d'où une invocation différente :

```bash
EMAIL=une.vraie@adresse.fr bash scripts/e2e-email.sh
```

Il affiche en fin de run la requête de nettoyage des comptes créés. Il ne prouve que le transport : le rendu des templates se juge à l'œil dans une vraie boîte.

`e2e-leagues.sh` et `e2e-scoring.sql` ne sont pas idempotents : **rejouer leur seed avant chaque exécution**.

### Côté serveur

`e2e-scoring.sql` vérifie le comportement de la RPC `apply_match_scores` elle-même (points, idempotence, passes 1 et 2, ré-agrégation des classements) — à exécuter dans le SQL editor ou via le MCP Supabase, après avoir rejoué `seed-test-scoring.sql`.

---

## Seeds

À exécuter sur le **projet dev uniquement** (SQL editor ou MCP `execute_sql`). L'ordre compte :

```
seed-test-users.sql          →  e2e.user1@trycast.local / e2e.user2@trycast.local
      ↓                          mot de passe : motdepasse123
seed-test-predictions.sql    →  matchs de test
      ↓
seed-test-scoring.sql  ·  seed-test-leagues.sql
```

`seed-competitions.sql` est indépendant et **idempotent** (upsert sur le slug) : les compétitions réelles du pipeline.

`admin-set-tries.sql` n'est pas un seed : saisie manuelle des essais d'un match terminé, utile tant qu'aucune interface admin n'existe.

---

## Vestige

`reset-project.js` vient du template `create-expo-app` (script `npm run reset-project`). Il **déplace `src/` et `scripts/` dans `example/`** pour repartir d'une app vierge — sans objet ici, et destructeur s'il est lancé par mégarde.
