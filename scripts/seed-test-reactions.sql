-- Seed des réactions de test pour scripts/e2e-reactions.sh.
-- À exécuter sur le projet DEV uniquement, après scripts/seed-test-users.sql.
-- Rejouable : nettoie puis recrée. À rejouer avant CHAQUE exécution (le script
-- pose des réactions et fait quitter la ligue à user2). Compétition dédiée
-- (e2e-reactions, inactive), indépendante des autres seeds.
--
--   -301 : kickoff il y a 1 heure, prono user1 (user2 sans prono)
--   -302 : kickoff dans 7 jours, prono user1 (réaction refusée : pas commencé)
-- Ligue E2ERCTS3 : user1 (owner) + user2.

delete from public.leagues where invite_code = 'E2ERCTS3';
delete from public.competitions where slug = 'e2e-reactions';

with comp as (
  insert into public.competitions
    (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
  values (-3, 2026, 'Compétition E2E réactions', 'e2e-reactions', current_date - 30, current_date + 90, false)
  returning id
),
new_matches as (
  insert into public.matches (competition_id, api_game_id, kickoff_at, round, status)
  select comp.id, m.api_game_id, m.kickoff_at, 'E2E', 'scheduled'
  from comp, (values
    (-301, now() - interval '1 hour'),
    (-302, now() + interval '7 days')
  ) as m (api_game_id, kickoff_at)
  returning id
)
insert into public.predictions (user_id, match_id, predicted_home_score, predicted_away_score)
select u.id, m.id, 20, 10
from new_matches m
join auth.users u on u.email = 'e2e.user1@trycast.local';

insert into public.leagues (name, invite_code, owner_id, competition_id)
select 'Ligue E2E réactions', 'E2ERCTS3', u.id, c.id
from auth.users u, public.competitions c
where u.email = 'e2e.user1@trycast.local' and c.slug = 'e2e-reactions';

insert into public.league_members (league_id, user_id, role)
select l.id, u.id, case when u.id = l.owner_id then 'owner' else 'member' end::public.league_role
from public.leagues l, auth.users u
where l.invite_code = 'E2ERCTS3'
  and u.email in ('e2e.user1@trycast.local', 'e2e.user2@trycast.local');
