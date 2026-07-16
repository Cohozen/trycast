-- Pages ligues (2026-07-16) : parcours « rejoindre » du design — aperçu de la
-- ligue avant adhésion (sheet) et plafond de 50 membres.
--
-- preview_league est, avec join_league, la SEULE résolution possible d'un
-- code (pas d'énumération par select, cf. 20260708000300). Elle ne renvoie
-- que l'identité de la ligue (nom, couleur, effectif, compétition), jamais le
-- roster : connaître un code donne un aperçu, pas les membres.
--
-- Plafond 50 : vérifié dans join_league sous verrou (select … for update sur
-- la ligue) pour sérialiser deux adhésions simultanées à 49 membres. errcode
-- P0003 ↔ leagues:errors.full côté client. L'idempotence est conservée : un
-- membre existant rejoue join_league sans erreur, même ligue pleine. Le
-- plafond n'est pas couvert par scripts/e2e-leagues.sh (il faudrait 50
-- comptes auth) : garanti par ce verrou + revue, testable manuellement en SQL.

create or replace function public.join_league(p_code text)
returns public.leagues
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_league public.leagues;
    v_count int;
begin
    if v_uid is null then
        raise exception 'join_league: non authentifié' using errcode = '42501';
    end if;
    select * into v_league
    from public.leagues
    where invite_code = upper(btrim(coalesce(p_code, '')))
    for update;
    if not found then
        raise exception 'join_league: code d''invitation invalide' using errcode = 'P0002';
    end if;
    if not exists (
        select 1 from public.league_members
        where league_id = v_league.id and user_id = v_uid
    ) then
        select count(*) into v_count
        from public.league_members
        where league_id = v_league.id;
        if v_count >= 50 then
            raise exception 'join_league: ligue complète (50 membres)'
                using errcode = 'P0003';
        end if;
    end if;
    insert into public.league_members (league_id, user_id, role)
    values (v_league.id, v_uid, 'member')
    on conflict (league_id, user_id) do nothing;
    return v_league;
end;
$$;

-- Aperçu avant adhésion : le client n'appelle la RPC qu'une fois le code
-- complet (8 caractères), la sheet affiche nom/couleur/effectif et adapte son
-- CTA (rejoindre / déjà membre / ligue pleine). Même contrat d'erreur que
-- join_league : P0002 sur code inconnu.
create or replace function public.preview_league(p_code text)
returns table (
    league_id uuid,
    name text,
    color text,
    member_count int,
    competition_name text,
    is_member boolean,
    is_full boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_league public.leagues;
    v_count int;
begin
    if v_uid is null then
        raise exception 'preview_league: non authentifié' using errcode = '42501';
    end if;
    select * into v_league
    from public.leagues l
    where l.invite_code = upper(btrim(coalesce(p_code, '')));
    if not found then
        raise exception 'preview_league: code d''invitation invalide'
            using errcode = 'P0002';
    end if;
    select count(*) into v_count
    from public.league_members lm
    where lm.league_id = v_league.id;
    return query
    select
        v_league.id,
        v_league.name,
        v_league.color,
        v_count,
        (select c.name from public.competitions c where c.id = v_league.competition_id),
        exists (
            select 1 from public.league_members lm
            where lm.league_id = v_league.id and lm.user_id = v_uid
        ),
        v_count >= 50;
end;
$$;

-- Les fonctions naissent exécutables par public (join_league garde ses grants
-- existants : même signature, create or replace les préserve)
revoke execute on function public.preview_league (text) from public, anon;
grant execute on function public.preview_league (text) to authenticated;
