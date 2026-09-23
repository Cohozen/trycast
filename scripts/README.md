# `scripts/` — outillage commun du dépôt

Scripts d'exploitation, lancés **depuis la racine** : génération et déploiement des e-mails, vérifications E2E contre Supabase, seeds de données de test, types générés, veille des dépendances. Les scripts propres à l'app (émulateur Android, release, mises à jour à distance) vivent dans [`apps/mobile/scripts/`](../apps/mobile/scripts/README.md).

**Tout ce dossier vise le projet désigné par `apps/mobile/.env`**, c'est-à-dire celui de **développement**. Aucun ref de projet n'est écrit en dur : `project-ref.mjs` le déduit d'`EXPO_PUBLIC_SUPABASE_URL`, et les scripts SQL lisent l'URL des Edge Functions dans le Vault du projet où on les exécute. Les identifiants viennent de ce même `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` — clé publishable uniquement, jamais de service role key).

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
| `e2e-jokers.sh` | Joker par phase : pose, déplacement, refus (sans prono, match commencé, hors phase, joker consommé), aucune écriture directe, visibilité ligue après kickoff | `seed-test-users.sql` + `seed-test-jokers.sql` (à rejouer avant chaque run) |
| `e2e-reactions.sh` | Réactions sur les pronos : pose, remplacement, retrait, refus (soi-même, clé inconnue, avant kickoff, cible sans prono, hors ligue), table fermée au client, liste des auteurs, auteur anonymisé après son départ de la ligue | `seed-test-users.sql` + `seed-test-reactions.sql` (à rejouer avant chaque run) |
| `e2e-round-highlights.sql` | Coup de la journée : lauréat unique (joker, exact, outsider), ex æquo, rien au-delà de 3 / en 1 contre 1 / avec un bonus en attente / journée inachevée, nul osé, étape KO, garde d'appartenance, cibles de la notification (préférence, déduplication, borne de 7 jours), contraintes du journal. `supabase db query --linked -f scripts/e2e-round-highlights.sql` | Aucun : transaction autonome, annulée à la fin |
| `e2e-previous-rank.sql` | Rang d'avant journée (`get_my_previous_rank`) : agrégat, départage (scores exacts puis moins de pronos scorés), comptes de démo exclus, frontière `p_before`, rang de l'appelant seul. `supabase db query --linked -f scripts/e2e-previous-rank.sql` | Aucun : transaction autonome, annulée à la fin |
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

`e2e-leagues.sh`, `e2e-jokers.sh`, `e2e-reactions.sh` et `e2e-scoring.sql` ne sont pas idempotents : **rejouer leur seed avant chaque exécution**.

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

seed-test-users.sql  →  seed-test-jokers.sql   (compétition e2e-jokers à part, avec ses phases et sa ligue)
seed-test-users.sql  →  seed-test-reactions.sql (compétition e2e-reactions à part, avec sa ligue)
```

`seed-test-leagues.sql` supprime **toutes** les ligues des users e2e, dont celle du seed jokers : rejouer `seed-test-jokers.sql` juste avant `e2e-jokers.sh`, et `seed-test-reactions.sql` juste avant `e2e-reactions.sh`.

`seed-competitions.sql` est indépendant et **idempotent** (upsert sur le slug) : les compétitions réelles du pipeline, **et leurs phases** (fenêtres de dates du joker, upsert sur `competition_id, key`).

---

## Données de démonstration

`seed-demo.mjs` peuple le dev de **16 faux joueurs qui jouent vraiment**, pour les passes visuelles, les parcours de test et les captures des stores. Ce ne sont **pas** des comptes `is_demo` (ceux du relecteur Play, `seed-demo-account.mjs`) : ils figurent au classement général.

```bash
node --no-warnings scripts/seed-demo.mjs           # purge puis sème — rejouable
node --no-warnings scripts/seed-demo.mjs --purge   # retire tout
```

**Rejouer juste avant chaque session** : les journées fictives sont calées sur l'heure d'exécution (le direct passe en `needs_review` au bout de 48 h). Connexion : `hugo@demo.trycast.local` / `motdepasse123` (le héros, pensé pour les captures) ; les autres joueurs suivent la forme `<pseudo en minuscules>@demo.trycast.local`. Le script imprime en fin de run le classement, les coups de la journée et **les deep links de chaque cas** — c'est l'index des passes visuelles, et l'entrée d'une future automatisation.

| Couvre | Où |
|---|---|
| Journées 1-3 réelles (juillet), pronos variés par style de joueur, jokers | nc-2026, vrais scores et essais |
| Terminé, **bonus offensif en attente**, **en direct**, coup d'envoi dans 45 min sans prono du héros, joker posé à venir | J4 fictive, autour de maintenant |
| Match **reporté**, match **annulé** | J5 fictive, à une semaine |
| **Coup de la journée** : J3 « coup parfait » (Titou64), J2 ex æquo avec le héros | ligue vitrine « Les Potes du Samedi » (`RUGBY226`, 12 membres) |
| Ligue dont le héros est **propriétaire** ; duo ; ligue solo ; ligue à **rejoindre** par code | `BUREAU26`, `DUETTE28`, `SEVENS29`, `RUCKXV26` |
| Réactions, boîte de réception du héros (2 non lues) | ligue vitrine |

Ce qu'il faut savoir :

- **Les points viennent du vrai pipeline** : `buildScoringPayload` (code de l'EF `sync-results`, importé tel quel — Node 24 retire les types) puis la RPC `apply_match_scores`. Un changement de barème se reflète au rejeu ; si le tirage ne produit plus les coups de la journée attendus, le script sort en erreur — revoir `SCENARIOS`.
- **Déterministe** : PRNG à graine fixe par (joueur, match). Ajouter un joueur ne change pas les pronos des autres.
- **Phase de joker `demo_gap`** : hors de toute phase de nc-2026 (l'intersaison), le script en crée une qui comble le trou entre les deux voisines, et la retire à la purge.
- **Garde** : il refuse de semer si de vrais matchs de nc-2026 tombent dans la fenêtre fictive (T−2 j..T+9 j) — en novembre, les journées fictives doublonneraient le calendrier réel. Il faudra alors décaler le scénario.
- Il lève `needs_review` sur les matchs de juillet terminés : sur le dev, la borne de 48 h de `sync-results` les avait marqués avant qu'on complète leurs résultats, et `apply_match_scores` refuse un match en revue.
- Il remplace `seed-demo-round-highlight.sql`, `seed-screenshot-matches.mjs` et `seed-upcoming-matches.sql`, et purge leurs restes (plages `-701..-706`, `-9001..-9006`, ligues `TRYCAST2`/`DEMERCT2`, comptes `demo*@trycast.fr` du dev). Il retire aussi `-601`/`-602` de `seed-test-notifications.sql`, dont la journée « Test notifications » s'affichait dans la frise des journées : rejouer ce seed juste avant un test de push, puis `seed-demo.mjs` après.
- Dev uniquement : aucune option ne vise un autre projet.

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

## Essais : import Wikipedia et saisie admin

Aucun fournisseur ne publie les essais. Depuis le 2026-09-15, le cron **`sync-tries-30min`** (EF `sync-tries`) les lit dans les encadrés `{{rugbybox}}` des pages Wikipedia déclarées dans `competitions.wikipedia_pages`. Il n'écrit que si le décompte reconstitue le score fourni par Highlightly (détail : `docs/spike-highlightly.md`). Il ne remonte pas au-delà de 14 jours.

L'EF accepte trois modes (body JSON, en-tête `x-sync-secret`) :

| Mode | Effet |
|---|---|
| `{}` (cron) | Matchs terminés en attente d'essais depuis moins de 14 jours |
| `{"mode":"backfill"}` | Idem sans la borne de 14 jours — après une panne, ou pour une compétition branchée en cours de saison |
| `{"mode":"audit"}` | N'écrit rien : compare Wikipedia aux essais **déjà saisis**. À lancer avant de renseigner les pages d'une nouvelle compétition |

Un match rejeté (`score_mismatch`, `checksum_failed`, `ambiguous`) reste dans la vue et se saisit à la main ; le motif est dans `job_runs` (requête 5 de `admin-set-tries.sql`). Un encadré pas encore rempli (`not_found`) se retente en silence, sans ligne `job_runs`.

La saisie manuelle devient le **repli**. `admin-set-tries.sql` n'est pas un seed mais un **aide-mémoire** à coller dans le SQL editor du projet dev, adossé à l'outillage de la migration `20260723000100_admin_tries.sql` :

| Objet | Rôle |
|---|---|
| Vue `admin_matches_pending_tries` | Ce qu'il reste à faire, en clair (noms d'équipes, score, état). Vide = rien à faire |
| Fonction `admin_set_match_tries(api_game_id, domicile, extérieur)` | La saisie en une ligne — refuse un match non terminé et rattrape les deux nombres inversés (`5 × essais > score`) |

Les deux sont réservés à `service_role` : invisibles depuis l'app, vérifié par `e2e-scoring.sh`.

Une fois les essais saisis, **il n'y a rien à déclencher** : la passe 2 du bonus offensif est ramassée par le cron `sync-results-10min`, les points arrivent en ≤ 10 min. Seul cas à traiter à part, signalé par la colonne `etat` de la vue : un match passé en `needs_review` est sorti du pipeline et doit être débloqué avant toute saisie.

---

## Veille des dépendances

| Commande | Effet |
|---|---|
| `npm run deps:check` | Rapport lisible : ce qui est en retard, rangé par famille. Ne modifie rien |
| `npm run deps:check -- --markdown` | Le même en Markdown — c'est ce que publie le workflow hebdomadaire |
| `npm run deps:check -- --json` | La structure brute |

### Pourquoi ce script existe

`npm outdated` affiche aujourd'hui **50 paquets**, ce qui ne veut rien dire : la moitié est pilotée
par le SDK Expo — suivre leur `latest` casserait le projet — et l'un d'eux est un faux positif
permanent. Un retard n'est exploitable qu'une fois rangé dans la famille qui lui correspond, parce
que chacune appelle une décision différente, et que trois d'entre elles n'en appellent aucune :

| Famille | Ce qu'on en fait |
|---|---|
| À réaligner sur le SDK | `npx expo install --fix` — Expo réclame ces versions, elles sont testées ensemble |
| Majeures | Rien tout de suite : la décision et sa raison vont dans [`docs/dependances.md`](../docs/dependances.md) |
| Rattrapage dans la plage | `npm update` — déjà autorisé par `package.json`, seul le lock bouge |
| Mineures hors plage | À prendre quand ça arrange |
| Écartés | Ni retard ni décision : `latest` y serait une régression (préversion NativeWind, paquets du SDK) |

Les sources croisées sont `npm outdated`, `npx expo install --check` — **l'autorité vivante**, elle
sait ce que le manifeste embarqué dans `node_modules` ignore encore —, `bundledNativeModules.json`
pour délimiter le périmètre du SDK, et `npm audit` pour la synthèse de sécurité.

⚠️ Un paquet marqué **⚑ natif** (dossier `android`/`ios`, `expo-module.config.json`, podspec) impose
un rebuild du dev client **et déplace l'empreinte** : les builds déjà distribués cesseraient de
recevoir les mises à jour à distance, sans le moindre message. Ces montées se groupent avec une
release, jamais au fil de l'eau.

### Codes de sortie

`0` quoi qu'il arrive, **sauf** si la collecte a échoué (registre injoignable) : dans ce cas `1`, et
le rapport le dit en tête. Un rapport annonçant « 0 paquet en retard » parce qu'il n'a rien pu lire
serait pire que pas de rapport — c'est la seule chose qui fait échouer le job hebdomadaire.

### Le rappel hebdomadaire

`.github/workflows/deps.yml` joue ce rapport le lundi matin et le verse dans **une issue unique**
(label `dependencies`). Le corps est réécrit à chaque passage ; un commentaire — donc une
notification — n'arrive que si la liste des majeures a changé, d'après la signature
`<!-- majeures: … -->` que le script pose en fin de rapport. Sans cette règle, l'issue produirait 52
alertes identiques par an et cesserait d'être lue. ⚠️ GitHub désactive les `schedule` d'un dépôt
public après 60 jours sans activité : `gh workflow run deps.yml` reste la porte de secours.
