-- Lot 5 : création et adhésion aux ligues, exclusivement par RPC (pas de
-- policy insert sur leagues/league_members). security definer : la création
-- est atomique (ligue + membership owner) et le code d'invitation est généré
-- côté serveur (pgcrypto — un code donne accès à la ligue, pas de random()
-- prédictible) ; l'adhésion résout le code sans jamais l'exposer à un select.

-- Création atomique : ligue + membership owner + code généré serveur.
create or replace function public.create_league(p_name text)
returns public.leagues
language plpgsql
security definer
set search_path = ''
as $$
declare
    -- 31 chars, sans ambiguïté visuelle (pas de 0/O/1/I/L) — aligné sur le
    -- check invite_code de la table
    v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    v_uid uuid := (select auth.uid());
    v_competition uuid;
    v_code text;
    v_bytes bytea;
    v_league public.leagues;
begin
    if v_uid is null then
        raise exception 'create_league: non authentifié' using errcode = '42501';
    end if;
    if p_name is null or char_length(btrim(p_name)) not between 3 and 40 then
        raise exception 'create_league: nom de ligue invalide (3 à 40 caractères)'
            using errcode = '23514';
    end if;
    select id into v_competition
    from public.competitions
    where is_active
    order by starts_on
    limit 1;
    if v_competition is null then
        raise exception 'create_league: aucune compétition active' using errcode = 'P0002';
    end if;

    -- 31^8 ≈ 8,5e11 combinaisons : la collision est théorique, on retente
    -- quand même (unique_violation) plutôt que d'échouer sur un coup de malchance
    for i in 1..5 loop
        v_bytes := extensions.gen_random_bytes(8);
        select string_agg(substr(v_alphabet, 1 + (get_byte(v_bytes, g) % 31), 1), '')
        into v_code
        from generate_series(0, 7) g;
        begin
            insert into public.leagues (name, invite_code, owner_id, competition_id)
            values (btrim(p_name), v_code, v_uid, v_competition)
            returning * into v_league;
            exit;
        exception when unique_violation then
            null; -- collision de code : nouvelle tentative
        end;
    end loop;
    if v_league.id is null then
        raise exception 'create_league: échec de génération du code d''invitation';
    end if;

    insert into public.league_members (league_id, user_id, role)
    values (v_league.id, v_uid, 'owner');
    return v_league;
end;
$$;

-- Adhésion par code. Idempotente : re-rejoindre renvoie la même ligue sans
-- doublon (on conflict do nothing).
create or replace function public.join_league(p_code text)
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
        raise exception 'join_league: non authentifié' using errcode = '42501';
    end if;
    select * into v_league
    from public.leagues
    where invite_code = upper(btrim(coalesce(p_code, '')));
    if not found then
        raise exception 'join_league: code d''invitation invalide' using errcode = 'P0002';
    end if;
    insert into public.league_members (league_id, user_id, role)
    values (v_league.id, v_uid, 'member')
    on conflict (league_id, user_id) do nothing;
    return v_league;
end;
$$;

-- Les fonctions naissent exécutables par public
revoke execute on function public.create_league (text) from public, anon;
revoke execute on function public.join_league (text) from public, anon;
grant execute on function public.create_league (text) to authenticated;
grant execute on function public.join_league (text) to authenticated;
