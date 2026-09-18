-- Seed des compétitions (Lot 2) — à exécuter sur le projet DEV (SQL editor ou MCP execute_sql).
-- Idempotent : ré-exécutable sans doublon (upsert sur slug).
--
-- Source de données : Highlightly (bascule du 2026-07-04, API-Sports écarté —
-- free tier limité aux saisons 2022-2024). leagueId relevés le 2026-07-04 :
--   curl -H "x-rapidapi-key: $HIGHLIGHTLY_API_KEY" \
--     "https://rugby.highlightly.net/leagues?leagueName=Nations Championship"
--   curl -H "x-rapidapi-key: $HIGHLIGHTLY_API_KEY" \
--     "https://rugby.highlightly.net/leagues?leagueName=Six Nations"
-- Ne pas utiliser d'ids trouvés ailleurs que dans la réponse Highlightly elle-même.
--
-- wikipedia_pages : pages EN dont sync-tries lit les essais (titres exacts, espaces
-- et non underscores). Une page qui n'existe pas encore est inoffensive : le run
-- trace l'erreur et retente au tick suivant.

insert into public.competitions
  (api_league_id, api_season, name, slug, starts_on, ends_on, is_active, wikipedia_pages)
values
  -- Nations Championship 2026 (juil-nov, inclut la TRC) — banc d'essai réel du pipeline (Jalon 1)
  (124179, 2026, 'Nations Championship', 'nc-2026',
   '2026-07-04', '2026-11-21', true,
   array['2026 Nations Championship Southern Hemisphere Series',
         '2026 Nations Championship Northern Hemisphere Series',
         '2026 Nations Championship']),
  -- Tournoi des Six Nations 2027 — soft-launch (inactive tant que le NC tourne)
  (44185, 2027, 'Tournoi des Six Nations 2027', 'six-nations-2027',
   '2027-02-05', '2027-03-13', false,
   array['2027 Six Nations Championship'])
on conflict (slug) do update set
  api_league_id = excluded.api_league_id,
  api_season = excluded.api_season,
  name = excluded.name,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active,
  wikipedia_pages = excluded.wikipedia_pages;

-- Phases de compétition (joker par phase, 2026-09-18) : fenêtres de dates
-- [starts_at, ends_at), la phase d'un match se déduit de son kickoff. Un joker
-- par phase. Dates NC relevées sur Wikipedia le 2026-09-18 : juillet 4-18,
-- novembre 6-21, finales 27-29 novembre (Twickenham). Les bornes laissent de
-- la marge pour un report, sans jamais se chevaucher (contrainte d'exclusion).
insert into public.competition_phases (competition_id, key, name, starts_at, ends_at, sort)
select c.id, v.key, v.name, v.starts_at::timestamptz, v.ends_at::timestamptz, v.sort
from public.competitions c
join (values
  ('nc-2026', 'july_window', 'Fenêtre de juillet', '2026-06-01', '2026-08-15', 1),
  ('nc-2026', 'november_window', 'Fenêtre de novembre', '2026-10-15', '2026-11-25', 2),
  ('nc-2026', 'finals', 'Finales', '2026-11-25', '2026-12-20', 3),
  ('six-nations-2027', 'tournament', 'Tournoi', '2027-01-15', '2027-04-01', 1)
) as v (slug, key, name, starts_at, ends_at, sort) on v.slug = c.slug
on conflict (competition_id, key) do update set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  sort = excluded.sort;
