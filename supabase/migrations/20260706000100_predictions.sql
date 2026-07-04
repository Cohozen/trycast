-- Lot 3 : pronostics (score exact + bonus offensifs), un par (user, match).
-- Deadline au coup d'envoi imposée ici par RLS — le client n'est qu'une UX.
-- Les colonnes points_* seront écrites au Lot 4 par la RPC de scoring
-- (service_role) : grants par colonne pour qu'aucun client ne puisse les toucher.

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_home_score int not null check (predicted_home_score >= 0),
  predicted_away_score int not null check (predicted_away_score >= 0),
  predicted_bonus_off_home boolean not null default false,
  predicted_bonus_off_away boolean not null default false,
  -- Résultat du scoring (Lot 4) : jamais écrites par les clients
  points_awarded int,
  points_breakdown jsonb,
  scoring_rule_version int,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- Chargement de tous les pronos d'un match par le scoring (Lot 4)
create index predictions_match_idx on public.predictions (match_id);

create or replace function public.set_predictions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_predictions_updated_at() from anon, authenticated, public;

create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.set_predictions_updated_at();

alter table public.predictions enable row level security;

-- Chacun ne voit que ses pronos. « Voir les pronos des amis après kickoff »
-- attendra les ligues (Lot 5) : la policy sera étendue à ce moment-là.
create policy "predictions_select_own"
  on public.predictions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- La deadline : insertion/modification possibles uniquement avant le kickoff
create policy "predictions_insert_own_before_kickoff"
  on public.predictions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and now() < (select kickoff_at from public.matches where id = match_id)
  );

create policy "predictions_update_own_before_kickoff"
  on public.predictions for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and now() < (select kickoff_at from public.matches where id = match_id)
  )
  with check (
    (select auth.uid()) = user_id
    and now() < (select kickoff_at from public.matches where id = match_id)
  );

-- Pas de policy DELETE : un prono se modifie, ne se supprime pas.

-- Grants : le projet dev a les default privileges legacy (grant all à
-- anon/authenticated sur toute nouvelle table) → on revoke tout puis on
-- n'accorde que l'usage réel. L'upsert PostgREST rejoue toutes les colonnes
-- du payload dans le ON CONFLICT DO UPDATE, d'où user_id/match_id aussi
-- présents dans le grant update (la RLS et l'unicité gardent la cohérence).
revoke all on public.predictions from anon, authenticated;
grant select on public.predictions to authenticated;
grant insert (
  user_id, match_id,
  predicted_home_score, predicted_away_score,
  predicted_bonus_off_home, predicted_bonus_off_away
) on public.predictions to authenticated;
grant update (
  user_id, match_id,
  predicted_home_score, predicted_away_score,
  predicted_bonus_off_home, predicted_bonus_off_away
) on public.predictions to authenticated;
grant all on public.predictions to service_role;
