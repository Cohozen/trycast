-- Seed des compétitions (Lot 2) — à exécuter sur le projet DEV (SQL editor ou MCP execute_sql).
-- Idempotent : ré-exécutable sans doublon (upsert sur slug).
--
-- ⚠️ À COMPLÉTER AVANT EXÉCUTION : relever les api_league_id et les dates exactes
-- des éditions via l'API (clé API-Sports requise) :
--   curl -H "x-apisports-key: $API_SPORTS_KEY" \
--     "https://v1.rugby.api-sports.io/leagues?search=championship"
--   curl -H "x-apisports-key: $API_SPORTS_KEY" \
--     "https://v1.rugby.api-sports.io/leagues?search=six nations"
-- Ne pas utiliser d'ids trouvés ailleurs que dans la réponse API-Sports elle-même.

insert into public.competitions
  (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
values
  -- The Rugby Championship 2026 — banc d'essai réel du pipeline (Jalon 1)
  (/* API_LEAGUE_ID_TRC */ null, 2026, 'The Rugby Championship 2026', 'trc-2026',
   '2026-08-08', '2026-10-03', true),
  -- Tournoi des Six Nations 2027 — soft-launch (inactive tant que la TRC tourne)
  (/* API_LEAGUE_ID_6N */ null, 2027, 'Tournoi des Six Nations 2027', 'six-nations-2027',
   '2027-02-06', '2027-03-20', false)
on conflict (slug) do update set
  api_league_id = excluded.api_league_id,
  api_season = excluded.api_season,
  name = excluded.name,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active;
