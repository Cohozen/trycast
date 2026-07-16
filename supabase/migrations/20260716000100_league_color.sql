-- Pages ligues (2026-07-16) : couleur d'identité de la ligue, choisie à la
-- création (design « Créer ou rejoindre une ligue » — l'icône reprend les
-- initiales sur fond de couleur). Palette fermée côté serveur (check) : le
-- grenat accent en est volontairement exclu (réservé à l'étincelle UI, jamais
-- un fond), le défaut est le vert marque. Miroir client :
-- src/features/leagues/colors.ts — toute évolution touche les deux fichiers.

alter table public.leagues
add column color text not null default '#14432A'
constraint leagues_color_allowed check (
    color in ('#14432A', '#2A6FDB', '#1F8A6B', '#E0952A', '#7A4F9E', '#3C4657')
);

-- L'owner peut retoucher la couleur comme le nom (grants colonne par colonne,
-- cf. 20260708000300 : pas de grant insert, update limité aux champs éditables)
grant update (color) on public.leagues to authenticated;

-- create or replace ne remplace pas une fonction dont la liste d'arguments
-- change : sans drop, create_league(text) et create_league(text, text)
-- coexisteraient et PostgREST refuserait l'appel pour ambiguïté. p_color a un
-- défaut : les appels existants ({p_name}) restent valides.
drop function public.create_league (text);

-- Création atomique : ligue + membership owner + code généré serveur
-- (reprise de 20260708000400, seul ajout : la couleur).
create or replace function public.create_league(
    p_name text,
    p_color text default '#14432A'
)
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
    -- Même liste que le check leagues_color_allowed : erreur propre plutôt
    -- qu'une violation de contrainte au message opaque
    if p_color is null or p_color not in
        ('#14432A', '#2A6FDB', '#1F8A6B', '#E0952A', '#7A4F9E', '#3C4657')
    then
        raise exception 'create_league: couleur hors palette' using errcode = '23514';
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
            insert into public.leagues (name, invite_code, owner_id, competition_id, color)
            values (btrim(p_name), v_code, v_uid, v_competition, p_color)
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

-- Les fonctions naissent exécutables par public
revoke execute on function public.create_league (text, text) from public, anon;
grant execute on function public.create_league (text, text) to authenticated;
