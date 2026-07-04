# Spike Highlightly — import automatique des essais

**Question** : Highlightly (highlightly.net, free tier 100 req/jour) peut-il fournir le
nombre d'essais par équipe des matchs terminés, pour automatiser la passe 2 du scoring
(bonus offensif) à la place de la saisie admin (`scripts/admin-set-tries.sql`) ?

**Critère de décision** : essais par équipe dérivables de façon fiable (événements typés
« try » attribués à une équipe, comptage exact vérifié sur 2-3 matchs réels) → EF
secondaire `sync-tries` planifiée (adossée au Lot 4 / v1.1). Sinon → la voie admin reste
le chemin nominal du MVP.

## Pré-analyse — documentation publique (2026-07-04, sans clé)

Lecture de <https://highlightly.net/rugby-api/documentation/> :

- ✅ Endpoint `GET /matches/{id}` existant (détail d'un match).
- ❌ L'exemple de réponse documenté ne contient **ni `events` ni `matchStatistics`** :
  il s'arrête à `venue`, `referee`, `forecast`, `predictions`, `lineups`.
- ❌ Aucune trace d'essais par équipe ; seul le score agrégé (`state.score`) apparaît.
- ⚠️ « Some results might be hidden with FREE tier » — périmètre exact du free tier non
  détaillé pour le détail de match (les odds, eux, sont explicitement hors free tier —
  sans impact : API-Sports fournit nos cotes).

**Signal préliminaire : défavorable.** La doc contredit ce qu'annonçait la page
marketing (`events`/`matchStatistics`). Une vérification empirique reste nécessaire :
la doc peut être partielle.

## Vérification empirique (Corentin, 2026-07-04)

Constat identique à la pré-analyse : **pas de statistiques de match visibles sur
Highlightly** — pas d'événements « try » ni de décompte d'essais exploitables.

## Décision (2026-07-04)

**Pour les essais : spike non concluant — pas d'EF `sync-tries`.** Le flux nominal du
MVP est le scoring en 2 temps avec saisie admin des essais après chaque match
(`tries_missing` + `scripts/admin-set-tries.sql`, ~1 min/match, max 3/jour en RWC).
À réévaluer seulement si une nouvelle source d'essais fiable apparaît d'ici la RWC 2027.

## Rebondissement (2026-07-04, soir) : Highlightly devient la source principale

Au premier run réel de `sync-fixtures`, découverte que le **free tier d'API-Sports est
limité aux saisons 2022-2024** (« Free plans do not have access to this season ») — le
risque n°1 du plan MVP, cru levé par le spike du 2026-07-03, était bien réel. Comparaison
des plans payants : API-Sports Pro 19 $/mois vs **Highlightly Pro 5,99 $/mois**
(7 500 req/jour, cotes 65+ bookmakers incluses, Nations Championship 2026 vérifié
accessible par Corentin). Décision : **bascule complète de `sync-fixtures` sur
Highlightly** (fixtures + cotes ; les essais restent en saisie admin, aucun des deux
fournisseurs ne les expose). API-Sports n'est plus utilisé.

Bascule validée en conditions réelles le soir même : 18 matchs / 12 équipes du
NC 2026 importés (leagueId 124179), idempotence vérifiée. Particularités relevées :
les Fidji y jouent sous « Fijian Drua » (alias ajouté au mapping équipes), et `/odds`
exige un plan payant (401 en Basic, capture best-effort en attendant l'upgrade Pro).
