-- Seed de la ligue de test pour scripts/e2e-leagues.sh.
-- À exécuter sur le projet DEV uniquement (SQL editor ou MCP execute_sql),
-- après scripts/seed-test-users.sql et scripts/seed-test-predictions.sql
-- (qui crée la compétition e2e-test). Rejouable : nettoie puis recrée.
--
-- Ligue « Ligue E2E », code fixe E2ETEST2, owner user1 (membership incluse) ;
-- user2 n'est PAS membre — c'est le point de départ des tests RLS
-- (invisibilité, anti-énumération par code, join par RPC).

-- Nettoyage : la ligue seedée + toute ligue créée par un run précédent du
-- script (create_league par les users e2e)
delete from public.leagues
where owner_id in (
    select id from auth.users where email like 'e2e.%@trycast.local'
);

insert into public.leagues (name, invite_code, owner_id, competition_id)
select 'Ligue E2E', 'E2ETEST2', u.id, c.id
from auth.users u, public.competitions c
where u.email = 'e2e.user1@trycast.local' and c.slug = 'e2e-test';

insert into public.league_members (league_id, user_id, role)
select l.id, l.owner_id, 'owner'
from public.leagues l
where l.invite_code = 'E2ETEST2';

-- Pages ligues (2026-07-16) : get_league_round_points ne compte que les
-- journées entamées (matchs finished) et les pronos réconciliés. On termine le
-- match passé -102 sur le score 10-5 (le prono seedé de user1 : score exact)
-- et on le score à la main — points arbitraires, standings non recalculé
-- (hors sujet ici, e2e-scoring a son propre seed). Rejouable : valeurs fixes.
update public.matches
set status = 'finished', home_score = 10, away_score = 5
where api_game_id = -102;

update public.predictions
set points_awarded = 8, scored_at = now()
where match_id = (select id from public.matches where api_game_id = -102);
