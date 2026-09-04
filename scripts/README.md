# `scripts/` — outillage du projet

Scripts d'exploitation : génération et déploiement des e-mails, vérifications E2E contre Supabase, seeds de données de test.

**Tout ce dossier vise le projet désigné par le `.env`**, c'est-à-dire celui de **développement**. Aucun ref de projet n'est écrit en dur : `project-ref.mjs` le déduit d'`EXPO_PUBLIC_SUPABASE_URL`, et les scripts SQL lisent l'URL des Edge Functions dans le Vault du projet où on les exécute. Les identifiants viennent de `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` — clé publishable uniquement, jamais de service role key).

Seule exception : `push-email-config.mjs` accepte `--project=<ref>` pour pousser les e-mails en production. C'est le seul script qui écrit de la configuration, et la production doit se nommer explicitement.

---

## E-mails d'auth

| Commande | Effet |
|---|---|
| `npm run emails:build` | Régénère `supabase/templates/*.html` |
| `npm run emails:check` | Échoue si un template a dérivé, ou si les sujets de `config.toml` ne correspondent plus |
| `npm run emails:push -- --dry-run` | Affiche le diff avec la config en ligne, n'écrit rien |
| `npm run emails:push` | Pousse sujets, contenus, `mailer_otp_length` et les 2 notifications de sécurité **sur le projet du `.env`** |
| `npm run emails:push -- --project=<ref>` | Même chose sur un autre projet — la façon de pousser en **production** |

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

## Builds et mises à jour à distance

| Commande | Effet |
|---|---|
| `npm run build:dev` | Dev client Android (APK, à installer soi-même) |
| `npm run build:preview` | Build de release sur le projet **dev** — sert aux captures et à valider l'OTA |
| `npm run build:prod` | **AAB** pour la Play Console, sur le projet **prod** |
| `npm run build:list` | Les 5 derniers builds Android |
| `npm run ota:preview -- --message "…"` | Mise à jour à distance sur le canal `preview` |
| `npm run ota:prod -- --message "…"` | Mise à jour à distance sur le canal `production` |
| `npm run ota:list` | Les 5 dernières mises à jour publiées |
| `npm run env:preview` / `env:prod` | Variables EAS de l'environnement, à vérifier avant un build |

Android uniquement : iOS est différé faute de compte Apple Developer. Ces scripts
gagneront leur variante le jour venu.

### Quand une mise à jour suffit, et quand il faut rebuilder

Un correctif **JavaScript** (texte, style, logique, écran) part par `ota:*` et arrive chez les
testeurs à leur deuxième lancement — pas de relecture Google, pas de téléversement.

Un changement **natif** (lib native ajoutée ou retirée, `app.json`, montée de SDK) impose un
nouveau build. La politique `fingerprint` le dit sans ambiguïté : l'empreinte change, et une
mise à jour publiée depuis ce code serait refusée par les appareils.

### ⚠️ Ce qui déplace la version d'exécution

Une mise à jour n'est délivrée qu'aux builds portant la **même empreinte**. Si elle diffère,
rien ne casse et rien ne s'affiche : la mise à jour n'arrive simplement jamais. On ne le
découvre qu'en constatant que le correctif n'est pas là.

**Vécu le 3 septembre 2026** : ajouter des commandes npm à `package.json` a suffi à changer
l'empreinte et à couper le build déjà distribué de toute mise à jour. Le champ `scripts` est
une source de l'empreinte par défaut — un script `android`/`ios` peut trahir un projet en
workflow natif. Ce n'est pas le cas ici, d'où l'exclusion posée dans `fingerprint.config.js`.

Vérifier avant de publier, en comparant à l'empreinte du build installé (visible sur
`npm run build:list`, ligne *Fingerprint*) :

```bash
npx expo-updates fingerprint:generate --platform android
```

Ce qui déplace légitimement l'empreinte, et impose donc un nouveau build : une dépendance
native ajoutée ou retirée, `app.json`, `eas.json`, les plugins de configuration, les assets
déclarés dans la config, une montée de SDK. Et `fingerprint.config.js` lui-même — à ne
modifier qu'en même temps qu'une release.

### `ota.mjs` : pourquoi un script et pas une ligne

`eas update` est la seule commande du projet qui change **instantanément** ce que les
utilisateurs exécutent, sans aucun des filets que le passage par le store fournit. Le script
rétablit trois garanties :

- **Arbre de travail propre.** Publier du code non commité rend impossible de savoir plus tard
  ce que les gens faisaient tourner. EAS le signale d'un astérisque après le hash du commit —
  facile à ne pas voir. `--allow-dirty` lève la contrainte, délibérément.
- **Typecheck et tests au vert** avant l'envoi. `--skip-checks` pour un correctif d'urgence.
- **Un message d'au moins 10 caractères.** Il devient l'étiquette de la mise à jour dans le
  tableau de bord : « fix » ne dira rien dans trois semaines.

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
| `e2e-scoring.sh` | Barème lisible mais inviolable, `apply_match_scores` et l'outillage admin des essais verrouillés | + `seed-test-scoring.sql` |
| `e2e-leagues.sh` | Invisibilité aux non-membres, anti-énumération, quitter/exclure | + `seed-test-leagues.sql` |
| `e2e-notifications.sh` | Tokens push par RPC, isolation des préférences | `seed-test-users.sql` |
| `e2e-privacy.sh` | `consents` append-only, Edge Function `export-data`, étanchéité des tables waitlist | `seed-test-users.sql` |
| `e2e-email.sh` | Transport SMTP Resend | aucun |
| `e2e-password-reset.sh` | Reset par code : usage unique, ancien mot de passe révoqué | aucun |

⚠️ **`e2e-email.sh` et `e2e-password-reset.sh` envoient de vrais e-mails et créent des comptes**, d'où une invocation différente :

```bash
EMAIL=une.vraie@adresse.fr bash scripts/e2e-email.sh
```

Ils affichent en fin de run la requête de nettoyage des comptes créés. `e2e-email.sh` ne prouve que le transport : le rendu des templates se juge à l'œil dans une vraie boîte.

`e2e-password-reset.sh` se joue en **deux passes**, le code n'étant lisible que dans l'e-mail (GoTrue n'en stocke que l'empreinte) :

```bash
EMAIL=une.vraie@adresse.fr bash scripts/e2e-password-reset.sh              # envoie le code
EMAIL=une.vraie@adresse.fr CODE=418207 bash scripts/e2e-password-reset.sh  # déroule les assertions
```

`e2e-leagues.sh` et `e2e-scoring.sql` ne sont pas idempotents : **rejouer leur seed avant chaque exécution**.

### ⚠️ Les seeds ne se cumulent pas

**Ne jamais jouer les cinq seeds en une seule passe.** Ils se marchent dessus : `seed-test-scoring.sql`
fait un `update public.predictions` qui remet à zéro les `points_awarded` que `seed-test-leagues.sql`
vient de poser sur le match −102. Résultat, `e2e-leagues.sh` échoue sur l'assertion « round points pour
l'owner » — un rouge qui ressemble à une régression et n'en est pas (vécu le 2026-09-03, au montage du
nouveau projet de dev).

Chaque seed non idempotent se joue **juste avant son propre script**, pas en préparation globale.

Et **`e2e-auth.sh` passe en dernier** : il supprime `e2e.user2` pour tester `delete-account`, ce qui fait
échouer tous les scripts suivants sur un `KeyError: 'access_token'` au login. Pour le recréer sans repasser
par le SQL editor (GoTrue refuse les adresses `.local` à l'inscription publique, mais pas à l'admin) :

```bash
KEY=$(supabase projects api-keys --project-ref <ref-dev> -o json \
  | python3 -c "import json,sys; print(next(k['api_key'] for k in json.load(sys.stdin) if k['name']=='service_role'))")
curl -s -X POST "$EXPO_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"email":"e2e.user2@trycast.local","password":"motdepasse123","email_confirm":true,"user_metadata":{"username":"TestUser2"}}'
```

### Côté serveur

`e2e-scoring.sql` vérifie le comportement de la RPC `apply_match_scores` elle-même (points, idempotence, passes 1 et 2, ré-agrégation des classements) — à exécuter dans le SQL editor ou via le MCP Supabase, après avoir rejoué `seed-test-scoring.sql`.

`e2e-waitlist.sql` vérifie l'anti-spam de la liste d'attente : plus aucune IP en clair (`ip_hash` en sha256 hex), rate limit de 3/h par IP intact après le passage au haché, refus silencieux au-delà, sel unique du jour. Idempotent — il nettoie ses propres données.

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

---

## Notifications push sur un vrai téléphone

`e2e-notifications.sh` prouve les règles d'accès, pas le transport. Pour vérifier qu'un push **arrive réellement**, deux fichiers, à jouer dans cet ordre quand le calendrier réel n'offre plus de match :

| Fichier | Rôle |
|---|---|
| `seed-test-notifications.sql` | Crée le match `-601` (coup d'envoi dans 45 min, sans prono → rappel) et le match `-602` (terminé, non scoré, un prono par appareil → résultats). Cible tous les users porteurs d'un token push. Rejouable ; section de nettoyage commentée en fin de fichier |
| `trigger-notify.sql` | Déclenche `sync-results` puis `notify` à la main (pg_net + secret Vault, comme les crons), puis relit `job_runs` et `notification_sends` |

Le rappel n'a de sens que dans les 60 min avant le coup d'envoi : **rejouer le seed juste avant le déclenchement**, pas la veille.

⚠️ Prérequis Expo côté Android : la **clé de compte de service FCM V1** doit être déposée sur le projet EAS (`eas credentials` → Android → Push Notifications). Sans elle, l'Expo Push API rend `InvalidCredentials` sur chaque ticket, `job_runs.detail.errors` le dit, et rien n'arrive sur le téléphone. Diagnostic en une commande :

```bash
curl -s -X POST https://exp.host/--/api/v2/push/send -H "Content-Type: application/json" -d '{"to":"ExponentPushToken[…]","title":"Test","body":"Ping"}'
```

---

## Saisie admin des essais

Les essais ne sont pas fournis par l'API : c'est la seule donnée de match saisie à la main, après chaque journée. `admin-set-tries.sql` n'est pas un seed mais un **aide-mémoire** à coller dans le SQL editor du projet dev, adossé à l'outillage de la migration `20260723000100_admin_tries.sql` :

| Objet | Rôle |
|---|---|
| Vue `admin_matches_pending_tries` | Ce qu'il reste à faire, en clair (noms d'équipes, score, état). Vide = rien à faire |
| Fonction `admin_set_match_tries(api_game_id, domicile, extérieur)` | La saisie en une ligne — refuse un match non terminé et rattrape les deux nombres inversés (`5 × essais > score`) |

Les deux sont réservés à `service_role` : invisibles depuis l'app, vérifié par `e2e-scoring.sh`.

Une fois les essais saisis, **il n'y a rien à déclencher** : la passe 2 du bonus offensif est ramassée par le cron `sync-results-10min`, les points arrivent en ≤ 10 min. Seul cas à traiter à part, signalé par la colonne `etat` de la vue : un match passé en `needs_review` est sorti du pipeline et doit être débloqué avant toute saisie.
