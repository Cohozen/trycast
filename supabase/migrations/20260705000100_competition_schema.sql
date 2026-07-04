-- Lot 2 : schéma pipeline compétition (competitions, teams, matches)
-- Lecture : utilisateurs authentifiés. Écriture : service_role uniquement
-- (Edge Function sync-fixtures + scripts admin) — aucune policy d'écriture.

create type public.match_status as enum
  ('scheduled', 'in_play', 'finished', 'postponed', 'cancelled');

-- Une ligne = un tournoi × une saison (« The Rugby Championship 2026 »).
-- Seed manuel : scripts/seed-competitions.sql. L'UI n'affiche que is_active.
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  api_league_id int not null,
  api_season int not null,
  name text not null,
  slug text not null unique,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  unique (api_league_id, api_season)
);

-- Peuplée par sync-fixtures (upsert sur api_team_id). code/flag_emoji/color
-- viennent du mapping statique du repo (IP-safe) — null si nation hors mapping.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  api_team_id int not null unique,
  name text not null,
  code text,
  flag_emoji text,
  color text
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  api_game_id int not null unique,
  -- Équipes nullables : matchs « à déterminer » avant tirage (RWC 2027)
  home_team_id uuid references public.teams (id),
  away_team_id uuid references public.teams (id),
  kickoff_at timestamptz not null,
  round text,
  status public.match_status not null default 'scheduled',
  -- Cotes : dernière capture avant kickoff fait foi pour le scoring
  odds_home numeric,
  odds_draw numeric,
  odds_away numeric,
  odds_source text check (odds_source in ('api', 'default')),
  odds_captured_at timestamptz,
  -- Résultat & scoring : colonnes écrites au Lot 4 (sync-results / apply_match_scores),
  -- sauf home_tries/away_tries (saisie admin, scripts/admin-set-tries.sql)
  home_score int,
  away_score int,
  home_tries int,
  away_tries int,
  tries_missing boolean not null default false,
  needs_review boolean not null default false,
  scored_at timestamptz
);

create index matches_competition_kickoff_idx
  on public.matches (competition_id, kickoff_at);

alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;

create policy "competitions_select_authenticated"
  on public.competitions for select
  to authenticated
  using (true);

create policy "teams_select_authenticated"
  on public.teams for select
  to authenticated
  using (true);

create policy "matches_select_authenticated"
  on public.matches for select
  to authenticated
  using (true);

-- Les nouvelles tables ne sont plus exposées par défaut aux rôles Data API :
-- grants explicites requis en plus des policies RLS.
grant select on public.competitions, public.teams, public.matches to authenticated;
grant all on public.competitions, public.teams, public.matches to service_role;
