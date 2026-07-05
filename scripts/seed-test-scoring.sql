-- Seed du match de test pour scripts/e2e-scoring.sh et scripts/e2e-scoring.sql.
-- À exécuter sur le projet DEV uniquement (SQL editor ou MCP execute_sql),
-- après scripts/seed-test-users.sql et scripts/seed-test-predictions.sql
-- (qui crée la compétition e2e-test). Rejouable : nettoie puis recrée.
--
-- Match api_game_id -103 : terminé, score 24-17, cotes 1.5/21/2.8, essais non
-- saisis (tries_missing) — l'état exact d'un match en attente de passe 1.
-- La compétition e2e-test est INACTIVE : invisible de sync-results, seul
-- l'appel direct de la RPC (e2e-scoring.sql) score ce match.
-- Pronos (insérés en service_role, la RLS deadline ne s'applique pas ici) :
--   user1 : 20-10 + bonus offensif domicile → bon vainqueur, bonus en attente
--   user2 : 10-20 → mauvais vainqueur, 0 point attendu

delete from public.matches where api_game_id = -103;

with comp as (
  select id from public.competitions where slug = 'e2e-test'
),
new_match as (
  insert into public.matches (
    competition_id, api_game_id, kickoff_at, round, status,
    home_score, away_score, home_tries, away_tries, tries_missing,
    odds_home, odds_draw, odds_away, odds_source, odds_captured_at
  )
  select comp.id, -103, now() - interval '3 hours', 'E2E', 'finished',
         24, 17, null, null, true,
         1.5, 21, 2.8, 'api', now() - interval '1 day'
  from comp
  returning id
)
insert into public.predictions (
  user_id, match_id,
  predicted_home_score, predicted_away_score,
  predicted_bonus_off_home, predicted_bonus_off_away
)
select u.id, m.id, p.home, p.away, p.bonus_home, false
from new_match m
join (values
  ('e2e.user1@trycast.local', 20, 10, true),
  ('e2e.user2@trycast.local', 10, 20, false)
) as p (email, home, away, bonus_home) on true
join auth.users u on u.email = p.email;
