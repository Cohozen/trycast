-- Joker par phase (v1.1.0, 2026-09-18) : un match à points doublés par phase
-- de compétition, posable et déplaçable jusqu'au coup d'envoi du match doublé.
--
-- 1) competition_phases — la notion de phase n'existait pas : matches.round
--    n'est que le `week` brut de Highlightly (« 1 », « 2 »…), et le libellé
--    des phases finales y est inconnu. Une phase est donc une FENÊTRE DE
--    DATES par compétition, et la phase d'un match se déduit de son
--    kickoff_at. Rien à maintenir dans sync-fixtures. Corollaire assumé : un
--    match reporté hors de sa fenêtre change de phase.
--    Une compétition sans phase n'a pas de joker (le client masque le bouton).
--    Les fenêtres ne se chevauchent pas (contrainte d'exclusion) : un kickoff
--    appartient à au plus une phase.
--
-- 2) phase_jokers — PK (user_id, phase_id) : « un joker par phase » est porté
--    par la structure, sans trigger. Poser = insert, déplacer = update de
--    match_id, retirer = delete, le tout par les RPC de la migration suivante
--    (aucun grant d'écriture client : les gardes — kickoff, joker consommé,
--    prono existant — ne s'expriment pas proprement en policy).
--
-- Décisions Corentin (2026-09-18) : 1 joker par phase partout (le 6 Nations
-- n'a qu'une phase) ; visible des autres membres de la ligue après kickoff,
-- comme le prono.

create extension if not exists btree_gist with schema extensions;

create table public.competition_phases (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  -- Clé i18n côté client (jokers:phase.<key>) ; name sert de repli
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sort int not null default 0,
  check (starts_at < ends_at),
  unique (competition_id, key),
  constraint competition_phases_no_overlap exclude using gist (
    competition_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
);

alter table public.competition_phases enable row level security;

create policy "competition_phases_select_authenticated"
  on public.competition_phases for select
  to authenticated
  using (true);

revoke all on public.competition_phases from anon, authenticated;
grant select on public.competition_phases to authenticated;
grant all on public.competition_phases to service_role;

-- Phase d'un match : la fenêtre de sa compétition qui contient son kickoff.
-- Bornes [starts_at, ends_at) comme tstzrange par défaut.
create or replace function public.match_phase_id(p_match_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select cp.id
  from public.matches m
  join public.competition_phases cp
    on cp.competition_id = m.competition_id
    and m.kickoff_at >= cp.starts_at
    and m.kickoff_at < cp.ends_at
  where m.id = p_match_id;
$$;

revoke execute on function public.match_phase_id (uuid) from public, anon;
grant execute on function public.match_phase_id (uuid) to authenticated, service_role;

create table public.phase_jokers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  phase_id uuid not null references public.competition_phases (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, phase_id)
);

-- Lecture par le scoring (sync-results charge les jokers d'un match)
create index phase_jokers_match_idx on public.phase_jokers (match_id);

alter table public.phase_jokers enable row level security;

-- Chacun ne voit que ses jokers ; ceux des autres passent par
-- get_match_league_predictions, après kickoff seulement.
create policy "phase_jokers_select_own"
  on public.phase_jokers for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.phase_jokers from anon, authenticated;
grant select on public.phase_jokers to authenticated;
grant all on public.phase_jokers to service_role;
