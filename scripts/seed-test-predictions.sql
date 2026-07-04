-- Seed des matchs de test pour scripts/e2e-predictions.sh.
-- À exécuter sur le projet DEV uniquement (SQL editor ou MCP execute_sql),
-- après scripts/seed-test-users.sql. Rejouable : nettoie puis recrée.
--
-- Compétition e2e inactive (invisible dans l'app) avec deux matchs :
--   api_game_id -101 : kickoff dans 7 jours  → prono autorisé
--   api_game_id -102 : kickoff il y a 1 heure → prono refusé par la RLS
-- Un prono de user1 est posé sur le match passé (via service_role, la RLS
-- ne s'applique pas ici) pour vérifier que sa modification est refusée.

delete from public.competitions where slug = 'e2e-test';

with comp as (
  insert into public.competitions
    (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
  values (-1, 2026, 'Compétition E2E', 'e2e-test', current_date, current_date + 30, false)
  returning id
),
new_matches as (
  insert into public.matches (competition_id, api_game_id, kickoff_at, round, status)
  select comp.id, m.api_game_id, m.kickoff_at, 'E2E', 'scheduled'
  from comp, (values
    (-101, now() + interval '7 days'),
    (-102, now() - interval '1 hour')
  ) as m (api_game_id, kickoff_at)
  returning id, api_game_id
)
insert into public.predictions (user_id, match_id, predicted_home_score, predicted_away_score)
select u.id, m.id, 10, 5
from new_matches m
join auth.users u on u.email = 'e2e.user1@trycast.local'
where m.api_game_id = -102;
