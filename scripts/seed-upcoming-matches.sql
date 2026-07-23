-- Seed de matchs à venir (aide au test manuel de la saisie de pronos) — à jouer
-- sur le projet DEV uniquement, quand le calendrier réel n'offre plus de match
-- futur (Highlightly publie les journées au fil de l'eau).
--
-- 6 matchs `scheduled` dans la compétition ACTIVE (nc-2026), tous avec un
-- kickoff futur (donc pronostiquables : la deadline RLS est au coup d'envoi) et
-- des cotes `api` pour exercer la pondération du barème. Étalés sur ~10 jours.
-- Plage api_game_id -701..-706, distincte des matchs de notification (-601/-602)
-- pour un nettoyage indépendant (bloc commenté en fin de fichier).
--
-- Rejouable : nettoie puis recrée. Aucun prono inséré (c'est le geste à tester).

delete from public.matches where api_game_id between -706 and -701;

insert into public.matches (
  competition_id, api_game_id, kickoff_at, round, status,
  home_team_id, away_team_id,
  odds_home, odds_draw, odds_away, odds_source, odds_captured_at
)
select
  c.id, v.api_game_id, now() + v.kickoff_in, v.round, 'scheduled',
  (select id from public.teams where code = v.home_code),
  (select id from public.teams where code = v.away_code),
  v.odds_home, v.odds_draw, v.odds_away, 'api', now()
from public.competitions c
cross join (values
  -- api_game_id, délai avant kickoff, journée, domicile, extérieur, cotes H/N/A
  (-701, interval '3 hours',  'Journée de test', 'FRA', 'SCO', 1.45, 22.0, 2.90),
  (-702, interval '1 day',    'Journée de test', 'IRL', 'ENG', 1.75, 21.0, 2.10),
  (-703, interval '2 days',   'Journée de test', 'NZL', 'AUS', 1.30, 24.0, 3.60),
  (-704, interval '4 days',   'Journée de test', 'RSA', 'ARG', 1.55, 23.0, 2.55),
  (-705, interval '7 days',   'Journée de test', 'WAL', 'ITA', 2.05, 20.0, 1.80),
  (-706, interval '10 days',  'Journée de test', 'JPN', 'FIJ', 1.90, 22.0, 1.95)
) as v (api_game_id, kickoff_in, round, home_code, away_code, odds_home, odds_draw, odds_away)
where c.slug = 'nc-2026';

-- Contrôle : 6 matchs à venir, cotes présentes, équipes résolues
select m.api_game_id, m.kickoff_at, th.name as home, ta.name as away,
       m.odds_home, m.odds_draw, m.odds_away
from public.matches m
join public.teams th on th.id = m.home_team_id
join public.teams ta on ta.id = m.away_team_id
where m.api_game_id between -706 and -701
order by m.kickoff_at;

-- ---------------------------------------------------------------------------
-- NETTOYAGE (quand le test est fini). Les pronos que tu auras saisis sur ces
-- matchs partent en cascade avec eux ; comme ils ne sont jamais scorés
-- (matchs à venir), les classements ne sont pas concernés.
-- ---------------------------------------------------------------------------
-- delete from public.matches where api_game_id between -706 and -701;
