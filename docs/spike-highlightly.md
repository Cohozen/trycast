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

**Spike non concluant — pas d'EF `sync-tries`.** Le flux nominal du MVP est le scoring
en 2 temps avec saisie admin des essais après chaque match (`tries_missing` +
`scripts/admin-set-tries.sql`, ~1 min/match, max 3/jour en RWC). À réévaluer seulement
si une nouvelle source d'essais fiable apparaît d'ici la RWC 2027.
