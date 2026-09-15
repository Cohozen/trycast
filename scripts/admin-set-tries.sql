-- Saisie admin des essais — aide-mémoire à coller dans le SQL editor du projet DEV
-- (ou via MCP execute_sql). Outillage créé par la migration 20260723000100.
--
-- Les essais ne viennent pas de l'API. Depuis le 2026-09-15, le cron sync-tries-30min
-- les importe de Wikipedia quand le décompte reconstitue le score : cette saisie
-- n'est plus que le REPLI, pour les matchs qu'il a rejetés (motif : requête 5) ou
-- qui dépassent ses 14 jours. Une fois saisis, les points suivent tout seuls au
-- prochain tick de sync-results (cron toutes les 10 min, passe 2 du bonus
-- offensif) — rien à déclencher.

-- 1. Qu'y a-t-il à faire ? La vue est vide quand tout est à jour.
--    Colonne `etat` :
--      « essais à saisir »       → passer à l'étape 2
--      « scoring en attente »    → essais saisis, la passe 2 n'a pas encore tourné
--      « bloqué (needs_review) » → voir l'étape 4 AVANT de saisir
select * from public.admin_matches_pending_tries;

-- 2. Saisie d'un match (api_game_id lu dans la vue, puis essais domicile / extérieur).
--    Refusé si le match n'est pas terminé, ou si 5 × essais dépasse le score du
--    camp concerné — le garde-fou qui rattrape deux nombres inversés.
select public.admin_set_match_tries(<api_game_id>, <essais_domicile>, <essais_exterieur>);

-- 3. Toute une journée en une requête.
select public.admin_set_match_tries(g, h, a)
from (values
  (<api_game_id_1>, 4, 2),
  (<api_game_id_2>, 3, 3)
) as t (g, h, a);

-- 4. Match « bloqué (needs_review) » : sync-results l'a sorti du pipeline après
--    48 h sans résultat API. Tant que le drapeau est là, aucune saisie ne sera
--    prise en compte. Vérifier le score de la ligne, le corriger si besoin,
--    puis débloquer :
--
--   update public.matches
--   set needs_review = false
--   where api_game_id = <api_game_id>;

-- 5. Pourquoi l'import Wikipedia n'a-t-il pas écrit un match ? Derniers runs de
--    sync-tries : écritures (avec la révision de page utilisée) et rejets motivés.
--      score_mismatch  → l'encadré ne porte pas le score Highlightly (encadré en
--                        cours d'édition, ou score fournisseur à corriger)
--      checksum_failed → le décompte ne redonne pas le score : encadré incomplet
--      ambiguous       → deux encadrés pour la même affiche à ±1 jour
--    Un encadré pas encore rempli (not_found) ne laisse pas de ligne.
select started_at, status, detail -> 'written' as ecrits, detail -> 'rejected' as rejetes, detail -> 'errors' as erreurs
from public.job_runs
where job = 'sync-tries'
order by started_at desc
limit 10;
