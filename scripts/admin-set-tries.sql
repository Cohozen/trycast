-- Saisie admin des essais d'un match terminé (Lot 2) — à exécuter sur le projet DEV
-- (SQL editor ou MCP execute_sql). Le re-scoring (passe 2 du bonus offensif) est au Lot 4.
--
-- 1. Retrouver l'api_game_id du match (matchs terminés récents, essais manquants) :
--
--   select m.api_game_id, h.name as home, m.home_score, m.away_score, a.name as away,
--          m.kickoff_at, m.tries_missing
--   from public.matches m
--   left join public.teams h on h.id = m.home_team_id
--   left join public.teams a on a.id = m.away_team_id
--   where m.status = 'finished' and m.tries_missing
--   order by m.kickoff_at desc;
--
-- 2. Remplacer les 3 valeurs ci-dessous puis exécuter. Le `returning` sert de
--    vérification visuelle ; la condition status = 'finished' empêche une saisie
--    sur un match non joué.

update public.matches
set home_tries = <HOME_TRIES>,
    away_tries = <AWAY_TRIES>,
    tries_missing = false
where api_game_id = <API_GAME_ID>
  and status = 'finished'
returning id, api_game_id, home_score, away_score, home_tries, away_tries, tries_missing;
