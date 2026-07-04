-- Seed des compétitions (Lot 2) — à exécuter sur le projet DEV (SQL editor ou MCP execute_sql).
-- Idempotent : ré-exécutable sans doublon (upsert sur slug).
--
-- Source de données : Highlightly (bascule du 2026-07-04, API-Sports écarté —
-- free tier limité aux saisons 2022-2024). ⚠️ À COMPLÉTER : relever les leagueId
-- Highlightly (≠ ids API-Sports) avec la clé :
--   curl -H "x-rapidapi-key: $HIGHLIGHTLY_API_KEY" \
--     "https://rugby.highlightly.net/leagues?leagueName=Nations Championship"
--   curl -H "x-rapidapi-key: $HIGHLIGHTLY_API_KEY" \
--     "https://rugby.highlightly.net/leagues?leagueName=Six Nations"
-- Ne pas utiliser d'ids trouvés ailleurs que dans la réponse Highlightly elle-même.

insert into public.competitions
  (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
values
  -- Nations Championship 2026 (juil-nov, inclut la TRC) — banc d'essai réel du pipeline (Jalon 1)
  (/* HIGHLIGHTLY_LEAGUE_ID_NC */ null, 2026, 'Nations Championship', 'nc-2026',
   '2026-07-04', '2026-11-21', true),
  -- Tournoi des Six Nations 2027 — soft-launch (inactive tant que le NC tourne)
  (/* HIGHLIGHTLY_LEAGUE_ID_6N */ null, 2027, 'Tournoi des Six Nations 2027', 'six-nations-2027',
   '2027-02-05', '2027-03-13', false)
on conflict (slug) do update set
  api_league_id = excluded.api_league_id,
  api_season = excluded.api_season,
  name = excluded.name,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active;
