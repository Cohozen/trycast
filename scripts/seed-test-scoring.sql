-- Seed des matchs de test pour scripts/e2e-scoring.sh et scripts/e2e-scoring.sql.
-- À exécuter sur le projet DEV uniquement (SQL editor ou MCP execute_sql),
-- après scripts/seed-test-users.sql et scripts/seed-test-predictions.sql
-- (qui crée la compétition e2e-test). Rejouable : nettoie puis recrée.
--
-- Match api_game_id -103 : terminé, score 24-17, cotes 1.5/21/2.8, essais non
-- saisis (tries_missing) — l'état exact d'un match en attente de passe 1.
-- Match api_game_id -104 : terminé, score 30-3, cotes 1.2/15/5.0, essais
-- saisis — scoré en un temps par e2e-scoring.sql pour vérifier l'agrégat
-- standings multi-matchs et le compteur exact_scores.
-- La compétition e2e-test est INACTIVE : invisible de sync-results, seul
-- l'appel direct de la RPC (e2e-scoring.sql) score ces matchs.
-- Pronos (insérés en service_role, la RLS deadline ne s'applique pas ici) :
--   -103 user1 : 20-10 + bonus offensif domicile → bon vainqueur, bonus en attente
--   -103 user2 : 10-20 → mauvais vainqueur, 0 point attendu
--   -104 user1 : 30-3 → score exact (18 pts vainqueur + 50 exact = 68)

-- Standings : recalculés par la RPC uniquement pour les users des matchs
-- scorés → reset explicite pour repartir d'un état propre
delete from public.standings
where competition_id = (select id from public.competitions where slug = 'e2e-test');

delete from public.matches where api_game_id in (-103, -104);

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

with comp as (
  select id from public.competitions where slug = 'e2e-test'
),
new_match as (
  insert into public.matches (
    competition_id, api_game_id, kickoff_at, round, status,
    home_score, away_score, home_tries, away_tries, tries_missing,
    odds_home, odds_draw, odds_away, odds_source, odds_captured_at
  )
  select comp.id, -104, now() - interval '2 hours', 'E2E', 'finished',
         30, 3, 2, 0, false,
         1.2, 15, 5.0, 'api', now() - interval '1 day'
  from comp
  returning id
)
insert into public.predictions (
  user_id, match_id,
  predicted_home_score, predicted_away_score,
  predicted_bonus_off_home, predicted_bonus_off_away
)
select u.id, m.id, 30, 3, false, false
from new_match m
join auth.users u on u.email = 'e2e.user1@trycast.local';
