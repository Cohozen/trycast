-- Joker par phase : les deux seules portes d'écriture sur phase_jokers.
-- security definer parce que le client n'a aucun grant d'écriture sur la
-- table : les gardes ci-dessous SONT la règle, le client n'est qu'une UX.
--
-- set_phase_joker(match) pose le joker de la phase du match, ou l'y déplace
-- depuis un autre match de la même phase, en un seul geste. Refus :
--   42501 not_authenticated  — pas de session ;
--   42501 match_started      — le match visé a commencé (même deadline que le prono) ;
--   42501 joker_locked       — le joker de la phase est sur un match commencé :
--                              il est CONSOMMÉ, ni déplaçable ni retirable ;
--   P0002 no_phase           — le match n'est dans aucune fenêtre de phase ;
--   P0002 no_prediction      — pas de prono sur ce match (doubler rien n'a pas de sens).
-- clear_phase_joker(phase) retire le joker, avec la même garde de consommation.
--
-- Les messages sont des identifiants stables, lus par errors.ts du domaine
-- jokers côté client pour distinguer les cas d'un même errcode.
-- Le `for update` sur la ligne existante sérialise deux appels concurrents du
-- même utilisateur ; l'insert initial est protégé par la PK (on conflict).

create or replace function public.set_phase_joker(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_kickoff timestamptz;
  v_phase uuid;
  v_current_match uuid;
  v_current_kickoff timestamptz;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select m.kickoff_at into v_kickoff from public.matches m where m.id = p_match_id;
  if v_kickoff is null then
    raise exception 'no_phase' using errcode = 'P0002';
  end if;
  if now() >= v_kickoff then
    raise exception 'match_started' using errcode = '42501';
  end if;

  v_phase := public.match_phase_id(p_match_id);
  if v_phase is null then
    raise exception 'no_phase' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.predictions p
    where p.user_id = v_user and p.match_id = p_match_id
  ) then
    raise exception 'no_prediction' using errcode = 'P0002';
  end if;

  select j.match_id, m.kickoff_at
    into v_current_match, v_current_kickoff
    from public.phase_jokers j
    join public.matches m on m.id = j.match_id
    where j.user_id = v_user and j.phase_id = v_phase
    for update of j;

  if v_current_match = p_match_id then
    return v_phase;
  end if;
  if v_current_match is not null and now() >= v_current_kickoff then
    raise exception 'joker_locked' using errcode = '42501';
  end if;

  insert into public.phase_jokers (user_id, phase_id, match_id)
  values (v_user, v_phase, p_match_id)
  on conflict (user_id, phase_id) do update
    set match_id = excluded.match_id, updated_at = now();

  return v_phase;
end;
$$;

create or replace function public.clear_phase_joker(p_phase_id uuid)
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

  select m.kickoff_at into v_kickoff
    from public.phase_jokers j
    join public.matches m on m.id = j.match_id
    where j.user_id = v_user and j.phase_id = p_phase_id
    for update of j;

  if v_kickoff is null then
    return; -- rien à retirer : idempotent
  end if;
  if now() >= v_kickoff then
    raise exception 'joker_locked' using errcode = '42501';
  end if;

  delete from public.phase_jokers
  where user_id = v_user and phase_id = p_phase_id;
end;
$$;

revoke execute on function public.set_phase_joker (uuid) from public, anon;
grant execute on function public.set_phase_joker (uuid) to authenticated;
revoke execute on function public.clear_phase_joker (uuid) from public, anon;
grant execute on function public.clear_phase_joker (uuid) to authenticated;
