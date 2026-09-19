-- Réactions : les deux seules portes d'écriture sur prediction_reactions.
-- security definer parce que le client n'a aucun grant sur la table : les
-- gardes ci-dessous SONT la règle, le client n'est qu'une UX.
--
-- set_prediction_reaction(ligue, match, cible, clé) pose ma réaction ou la
-- remplace. Refus :
--   42501 not_authenticated — pas de session ;
--   22023 invalid_reaction  — clé hors liste ;
--   22023 self_reaction     — on ne réagit pas à son propre prono ;
--   P0002 not_member        — l'auteur OU la cible n'est pas membre, ou le
--                             match n'est pas de la compétition de la ligue
--                             (même message : pas d'énumération) ;
--   42501 not_started       — avant le coup d'envoi, les pronos des autres
--                             sont secrets ; on ne réagit pas à l'invisible ;
--   P0002 no_prediction     — la cible n'a pas pronostiqué (ligne « — »).
-- clear_prediction_reaction retire MA réaction, sans autre garde : idempotente,
-- et possible même après avoir quitté la ligue (c'est ma donnée).
--
-- Les messages sont des identifiants stables, lus par errors.ts du domaine
-- reactions côté client. La toggle « retaper la même retire » est côté client.

create or replace function public.set_prediction_reaction(
  p_league_id uuid,
  p_match_id uuid,
  p_target_user_id uuid,
  p_reaction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_kickoff timestamptz;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_reaction is null or p_reaction not in ('bravo', 'lucky', 'bold', 'laugh') then
    raise exception 'invalid_reaction' using errcode = '22023';
  end if;
  if p_target_user_id = v_user then
    raise exception 'self_reaction' using errcode = '22023';
  end if;

  select m.kickoff_at into v_kickoff
    from public.leagues l
    join public.matches m
      on m.id = p_match_id
      and m.competition_id = l.competition_id
    where l.id = p_league_id
      and exists (
        select 1 from public.league_members lm
        where lm.league_id = l.id and lm.user_id = v_user
      )
      and exists (
        select 1 from public.league_members lm
        where lm.league_id = l.id and lm.user_id = p_target_user_id
      );
  if v_kickoff is null then
    raise exception 'not_member' using errcode = 'P0002';
  end if;
  if now() < v_kickoff then
    raise exception 'not_started' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.predictions p
    where p.user_id = p_target_user_id and p.match_id = p_match_id
  ) then
    raise exception 'no_prediction' using errcode = 'P0002';
  end if;

  insert into public.prediction_reactions
    (league_id, match_id, target_user_id, reactor_id, reaction)
  values (p_league_id, p_match_id, p_target_user_id, v_user, p_reaction)
  on conflict (league_id, match_id, target_user_id, reactor_id) do update
    set reaction = excluded.reaction, updated_at = now();
end;
$$;

create or replace function public.clear_prediction_reaction(
  p_league_id uuid,
  p_match_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.prediction_reactions
  where league_id = p_league_id
    and match_id = p_match_id
    and target_user_id = p_target_user_id
    and reactor_id = v_user;
end;
$$;

revoke execute on function public.set_prediction_reaction (uuid, uuid, uuid, text) from public, anon;
grant execute on function public.set_prediction_reaction (uuid, uuid, uuid, text) to authenticated;
revoke execute on function public.clear_prediction_reaction (uuid, uuid, uuid) from public, anon;
grant execute on function public.clear_prediction_reaction (uuid, uuid, uuid) to authenticated;
