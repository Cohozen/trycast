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

## Vérification empirique — À FAIRE (clé requise, compte à créer par Corentin)

1. Créer un compte gratuit sur highlightly.net, récupérer la clé.
2. Lister les matchs rugby récents terminés (tournées de juillet 2026), noter 2-3 ids
   (dont un match d'une nation « moyenne »).
3. `curl` sur `matches/{id}` : chercher des événements typés « try » attribués à une
   équipe, ou un décompte d'essais dans des statistiques.
4. Si présents : contre-vérifier le nombre d'essais avec les feuilles de match réelles.
5. Consigner ici les requêtes, extraits de réponse et la décision finale.

## Décision

_En attente de la vérification empirique._ Tant qu'elle n'est pas concluante, le flux
nominal du MVP est le scoring en 2 temps avec saisie admin des essais
(`tries_missing` + `scripts/admin-set-tries.sql`).
