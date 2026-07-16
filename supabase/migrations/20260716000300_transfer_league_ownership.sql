-- Pages ligues (2026-07-16) : transfert de propriété (zone danger admin du
-- design « Détail Ligue »). Revient sur le choix MVP « transfert = v2 » acté
-- dans 20260708000300 — validé par Corentin le 2026-07-16.
--
-- RPC security definer obligatoire : owner_id (leagues) et role
-- (league_members) ne sont pas modifiables par le client (grants colonnes
-- limités à name/color), et le swap doit être atomique — un état intermédiaire
-- (deux owners, ou aucun) casserait les policies delete/update qui reposent
-- sur owner_id et role. Verrou sur la ligue pour sérialiser un transfert
-- concurrent avec un join/kick. Non-owner ou ligue inconnue → même 42501
-- (pas d'énumération d'ids).

create or replace function public.transfer_league_ownership(
    p_league_id uuid,
    p_new_owner_id uuid
)
returns public.leagues
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_league public.leagues;
begin
    if v_uid is null then
        raise exception 'transfer_league_ownership: non authentifié'
            using errcode = '42501';
    end if;
    select * into v_league
    from public.leagues
    where id = p_league_id
    for update;
    if not found or v_league.owner_id <> v_uid then
        raise exception 'transfer_league_ownership: ligue introuvable ou non autorisé'
            using errcode = '42501';
    end if;
    if p_new_owner_id = v_uid then
        raise exception 'transfer_league_ownership: déjà propriétaire'
            using errcode = '23514';
    end if;
    if not exists (
        select 1 from public.league_members
        where league_id = p_league_id and user_id = p_new_owner_id
    ) then
        raise exception 'transfer_league_ownership: le destinataire n''est pas membre'
            using errcode = 'P0002';
    end if;

    update public.leagues
    set owner_id = p_new_owner_id
    where id = p_league_id;
    update public.league_members
    set role = 'member'
    where league_id = p_league_id and user_id = v_uid;
    update public.league_members
    set role = 'owner'
    where league_id = p_league_id and user_id = p_new_owner_id;

    select * into v_league from public.leagues where id = p_league_id;
    return v_league;
end;
$$;

-- Les fonctions naissent exécutables par public
revoke execute on function public.transfer_league_ownership (uuid, uuid) from public, anon;
grant execute on function public.transfer_league_ownership (uuid, uuid) to authenticated;
