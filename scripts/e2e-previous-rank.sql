-- Vérification E2E côté serveur du rang d'avant journée (migration
-- 20260923000100_my_previous_rank.sql) : agrégat, départage, exclusion des
-- comptes de démo, frontière p_before, rang de l'appelant seul.
--
-- AUTONOME ET SANS TRACE : tout se passe dans une transaction annulée à la fin
-- (utilisateurs, compétition, matchs, pronos). Aucun seed préalable. Sur le
-- projet DEV uniquement :
--   supabase db query --linked -f scripts/e2e-previous-rank.sql
-- Succès = une ligne « OK » ; un échec lève une exception qui nomme le cas.
--
-- Journée J1 (avant la frontière T) :
--   u1 30 pts ; u2 20 pts sans exact ; u3 20 pts avec un exact (devant u2) ;
--   u4 10 pts ; u5 compte de démo à 100 pts (hors général) ; u6 aucun prono.
-- Journée J2 (à partir de T) : u4 prend 100 pts — ne compte pas avant T.

begin;

create function pg_temp.expect(p_ok boolean, p_case text) returns void
language plpgsql as $$
begin
    if p_ok is not true then
        raise exception 'ÉCHEC : %', p_case;
    end if;
end;
$$;

create function pg_temp.mk_match(p_comp uuid, p_game int, p_hs int, p_as int, p_kickoff timestamptz)
returns uuid
language sql as $$
    insert into public.matches (
        competition_id, api_game_id, round, status, home_score, away_score,
        kickoff_at, scored_at, odds_home, odds_draw, odds_away
    )
    values (p_comp, p_game, 'R', 'finished', p_hs, p_as, p_kickoff, now(), 2, 20, 2)
    returning id;
$$;

create function pg_temp.pr(p_match uuid, p_user uuid, p_h int, p_a int, p_pts int)
returns void
language sql as $$
    insert into public.predictions (
        user_id, match_id, predicted_home_score, predicted_away_score,
        points_awarded, points_breakdown, scoring_rule_version, scored_at
    )
    values (p_user, p_match, p_h, p_a, p_pts, '{"offensiveBonusPending": false}', 2, now());
$$;

-- Rang vu par un joueur (appel sous son JWT, rôle authenticated)
create function pg_temp.rank_as(p_user uuid, p_comp uuid, p_before timestamptz)
returns int
language plpgsql as $$
declare
    v int;
begin
    perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v := public.get_my_previous_rank(p_comp, p_before);
    reset role;
    return v;
end;
$$;
grant execute on function pg_temp.rank_as(uuid, uuid, timestamptz) to authenticated;

do $$
declare
    u uuid[] := array[]::uuid[];
    v_id uuid;
    v_comp uuid;
    v_t timestamptz := now() - interval '1 day';
    m uuid;
begin
    for i in 1..6 loop
        insert into auth.users (
            instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at
        )
        values (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
            'authenticated', 'e2e.rank' || i || '@trycast.local',
            jsonb_build_object('username', 'RankUser' || i), now(), now()
        )
        returning id into v_id;
        u := u || v_id;
    end loop;
    update public.profiles set is_demo = true where id = u[5];

    insert into public.competitions (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
    values (-901, 2026, 'E2E Rank', 'e2e-rank', current_date - 30, current_date + 30, false)
    returning id into v_comp;

    -- J1, avant la frontière
    m := pg_temp.mk_match(v_comp, -9201, 20, 10, v_t - interval '2 days');
    perform pg_temp.pr(m, u[1], 25, 10, 30);
    perform pg_temp.pr(m, u[2], 25, 12, 20);
    perform pg_temp.pr(m, u[3], 20, 10, 20);
    perform pg_temp.pr(m, u[4], 30, 5, 10);
    perform pg_temp.pr(m, u[5], 20, 10, 100);

    -- J2, pile à la frontière : exclu (strictement avant)
    m := pg_temp.mk_match(v_comp, -9202, 20, 10, v_t);
    perform pg_temp.pr(m, u[4], 20, 10, 100);

    perform pg_temp.expect(pg_temp.rank_as(u[1], v_comp, v_t) = 1, 'u1 1er avant J2');
    perform pg_temp.expect(pg_temp.rank_as(u[3], v_comp, v_t) = 2, 'u3 devant u2 au score exact');
    perform pg_temp.expect(pg_temp.rank_as(u[2], v_comp, v_t) = 3, 'u2 3e');
    perform pg_temp.expect(pg_temp.rank_as(u[4], v_comp, v_t) = 4, 'u4 4e : J2 ne compte pas avant T');
    perform pg_temp.expect(pg_temp.rank_as(u[5], v_comp, v_t) is null, 'compte de démo hors général');
    perform pg_temp.expect(pg_temp.rank_as(u[6], v_comp, v_t) is null, 'aucun prono avant T : null');
    perform pg_temp.expect(
        pg_temp.rank_as(u[4], v_comp, v_t + interval '1 second') = 1,
        'après J2, u4 passe 1er'
    );
end;
$$;

select 'OK' as e2e_previous_rank;

rollback;
