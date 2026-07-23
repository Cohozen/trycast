-- Seed « notifications vivantes » (Lot 6) : fabrique de quoi déclencher un vrai
-- push sur un vrai téléphone, quand le calendrier réel n'offre plus de match.
-- À exécuter sur le projet DEV uniquement (SQL editor ou MCP execute_sql).
-- Rejouable : nettoie puis recrée.
--
-- Cible : TOUS les users ayant un token push enregistré (= les appareils de
-- test réellement connectés). Aucun compte n'est nommé en dur.
--
-- Match api_game_id -601 : à venir dans 45 min, statut scheduled, dans la
-- compétition ACTIVE (obligatoire : notify_reminder_targets joint c.is_active)
-- et sans prono → cible de la notification « Rappel de prono ».
-- Match api_game_id -602 : terminé il y a 3 h, score et essais saisis, PAS
-- encore scoré (scored_at null) + un prono par appareil → passe 1 de
-- sync-results, puis cible de la notification « Résultats & points ».
--
-- Enchaînement complet dans scripts/trigger-notify.sql.

-- Suppression en cascade : pronos, notification_sends et lignes de classement
-- dérivées de ces matchs disparaissent avec eux.
delete from public.matches where api_game_id in (-601, -602);

-- ---------------------------------------------------------------------------
-- -601 : le match à pronostiquer (rappel H-1)
-- ---------------------------------------------------------------------------
insert into public.matches (
  competition_id, api_game_id, kickoff_at, round, status,
  odds_home, odds_draw, odds_away, odds_source, odds_captured_at
)
select
  c.id, -601, now() + interval '45 minutes', 'Test notifications', 'scheduled',
  1.8, 24, 3.4, 'seed', now()
from public.competitions c
where c.slug = 'nc-2026';

update public.matches
set home_team_id = (select id from public.teams where code = 'FRA'),
    away_team_id = (select id from public.teams where code = 'IRL')
where api_game_id = -601;

-- ---------------------------------------------------------------------------
-- -602 : le match tout juste terminé (résultats & points)
-- ---------------------------------------------------------------------------
insert into public.matches (
  competition_id, api_game_id, kickoff_at, round, status,
  home_score, away_score, home_tries, away_tries, tries_missing, needs_review,
  odds_home, odds_draw, odds_away, odds_source, odds_captured_at
)
select
  c.id, -602, now() - interval '3 hours', 'Test notifications', 'finished',
  27, 24, 3, 2, false, false,
  1.9, 22, 3.1, 'seed', now() - interval '1 day'
from public.competitions c
where c.slug = 'nc-2026';

update public.matches
set home_team_id = (select id from public.teams where code = 'NZL'),
    away_team_id = (select id from public.teams where code = 'RSA')
where api_game_id = -602;

-- Un prono par appareil équipé : score exact (le message annoncera un joli
-- total), aucun bonus offensif coché → pas de volet en attente de passe 2.
insert into public.predictions (
  user_id, match_id,
  predicted_home_score, predicted_away_score,
  predicted_bonus_off_home, predicted_bonus_off_away
)
select distinct pt.user_id, m.id, 27, 24, false, false
from public.push_tokens pt
cross join public.matches m
where m.api_game_id = -602;

-- Contrôle : 1 match à venir sans prono, 1 match fini avec N pronos non scorés
select m.api_game_id, m.status, m.kickoff_at, m.scored_at,
       th.name as home, ta.name as away, count(p.id) as pronos
from public.matches m
left join public.teams th on th.id = m.home_team_id
left join public.teams ta on ta.id = m.away_team_id
left join public.predictions p on p.match_id = m.id
where m.api_game_id in (-601, -602)
group by m.api_game_id, m.status, m.kickoff_at, m.scored_at, th.name, ta.name
order by m.api_game_id desc;

-- ---------------------------------------------------------------------------
-- NETTOYAGE (à jouer quand le test est fini) — les matchs de seed sortent des
-- écrans, puis les classements de la compétition sont réagrégés depuis les
-- pronos réellement scorés (même agrégat que le backfill 20260708000100).
-- ---------------------------------------------------------------------------
-- delete from public.matches where api_game_id in (-601, -602);
--
-- delete from public.standings
-- where competition_id = (select id from public.competitions where slug = 'nc-2026');
--
-- insert into public.standings (user_id, competition_id, total_points, predictions_scored, exact_scores)
-- select p.user_id, m.competition_id,
--        coalesce(sum(p.points_awarded), 0)::int,
--        count(*)::int,
--        (count(*) filter (
--            where p.predicted_home_score = m.home_score
--              and p.predicted_away_score = m.away_score
--        ))::int
-- from public.predictions p
-- join public.matches m on m.id = p.match_id
-- where p.scored_at is not null
--   and m.competition_id = (select id from public.competitions where slug = 'nc-2026')
-- group by p.user_id, m.competition_id;
