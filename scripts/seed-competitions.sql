-- Seed des compétitions (Lot 2) — à exécuter sur le projet DEV (SQL editor ou MCP execute_sql).
-- Idempotent : ré-exécutable sans doublon (upsert sur slug).
--
-- Ids et dates relevés le 2026-07-04 via l'API (clé API-Sports requise) :
--   curl -H "x-apisports-key: $API_SPORTS_KEY" \
--     "https://v1.rugby.api-sports.io/leagues?search=championship"
--   curl -H "x-apisports-key: $API_SPORTS_KEY" \
--     "https://v1.rugby.api-sports.io/leagues?search=six nations"
-- Ne pas utiliser d'ids trouvés ailleurs que dans la réponse API-Sports elle-même.

insert into public.competitions
  (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
values
  -- Nations Championship 2026 (juil-nov, inclut la TRC) — banc d'essai réel du pipeline (Jalon 1)
  (145, 2026, 'Nations Championship', 'nc-2026',
   '2026-07-04', '2026-11-21', true),
  -- Tournoi des Six Nations 2027 — soft-launch (inactive tant que le NC tourne)
  (51, 2027, 'Tournoi des Six Nations 2027', 'six-nations-2027',
   '2027-02-05', '2027-03-13', false)
on conflict (slug) do update set
  api_league_id = excluded.api_league_id,
  api_season = excluded.api_season,
  name = excluded.name,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active;
