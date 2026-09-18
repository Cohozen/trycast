-- Seed des jokers de test pour scripts/e2e-jokers.sh.
-- À exécuter sur le projet DEV uniquement, après scripts/seed-test-users.sql.
-- Rejouable : nettoie puis recrée. Compétition dédiée (e2e-jokers, inactive),
-- indépendante des seeds predictions/leagues.
--
-- Phase A [now-30j, now+30j) :
--   -201 : kickoff dans 7 jours, prono user1
--   -203 : kickoff il y a 1 heure, prono user1 ET joker user1 (posé par
--          service_role) → le joker de la phase A est CONSOMMÉ
-- Phase B [now+30j, now+60j) :
--   -204 / -205 : kickoff dans 40 / 41 jours, prono user1 (pose puis déplacement)
--   -206 : kickoff dans 42 jours, SANS prono (pose refusée)
-- Hors phase : -207, kickoff dans 90 jours, prono user1 (pose refusée)
-- Ligue E2EJKRS2 : user1 (owner) + user2, pour get_match_league_predictions.

delete from public.leagues where invite_code = 'E2EJKRS2';
delete from public.competitions where slug = 'e2e-jokers';

with comp as (
  insert into public.competitions
    (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
  values (-2, 2026, 'Compétition E2E jokers', 'e2e-jokers', current_date - 30, current_date + 90, false)
  returning id
),
phases as (
  insert into public.competition_phases (competition_id, key, name, starts_at, ends_at, sort)
  select comp.id, p.key, p.name, p.starts_at, p.ends_at, p.sort
  from comp, (values
    ('e2e_a', 'Phase A', now() - interval '30 days', now() + interval '30 days', 1),
    ('e2e_b', 'Phase B', now() + interval '30 days', now() + interval '60 days', 2)
  ) as p (key, name, starts_at, ends_at, sort)
  returning id
),
new_matches as (
  insert into public.matches (competition_id, api_game_id, kickoff_at, round, status)
  select comp.id, m.api_game_id, m.kickoff_at, 'E2E', 'scheduled'
  from comp, (values
    (-201, now() + interval '7 days'),
    (-203, now() - interval '1 hour'),
    (-204, now() + interval '40 days'),
    (-205, now() + interval '41 days'),
    (-206, now() + interval '42 days'),
    (-207, now() + interval '90 days')
  ) as m (api_game_id, kickoff_at)
  returning id, api_game_id
)
insert into public.predictions (user_id, match_id, predicted_home_score, predicted_away_score)
select u.id, m.id, 20, 10
from new_matches m
join auth.users u on u.email = 'e2e.user1@trycast.local'
where m.api_game_id <> -206;

insert into public.phase_jokers (user_id, phase_id, match_id)
select u.id, public.match_phase_id(m.id), m.id
from public.matches m
join auth.users u on u.email = 'e2e.user1@trycast.local'
where m.api_game_id = -203;

insert into public.leagues (name, invite_code, owner_id, competition_id)
select 'Ligue E2E jokers', 'E2EJKRS2', u.id, c.id
from auth.users u, public.competitions c
where u.email = 'e2e.user1@trycast.local' and c.slug = 'e2e-jokers';

insert into public.league_members (league_id, user_id, role)
select l.id, u.id, case when u.id = l.owner_id then 'owner' else 'member' end::public.league_role
from public.leagues l, auth.users u
where l.invite_code = 'E2EJKRS2'
  and u.email in ('e2e.user1@trycast.local', 'e2e.user2@trycast.local');
