-- Vérification E2E côté serveur de la modération (chantier B de la 1.3.0,
-- migrations 20260926000100_username_filter.sql et 20260926000200_moderation.sql) :
-- filtre des pseudos, RLS des blocages et des signalements, réactions d'un
-- joueur bloqué masquées pour le bloqueur, outil moderate_profile.
--
-- AUTONOME ET SANS TRACE : tout se passe dans une transaction annulée à la fin.
-- L'alerte e-mail d'un signalement passe par pg_net, dont la file est
-- transactionnelle : rien ne part. Sur le projet DEV uniquement :
--   supabase db query --linked -f scripts/e2e-moderation.sql
-- Succès = une ligne « OK » ; un échec lève une exception qui nomme le cas.
--
-- u1, u2, u3 dans une ligue ; u2 et u3 réagissent au prono de u1 ; u3 bloque u2.

begin;

create function pg_temp.expect(p_ok boolean, p_case text) returns void
language plpgsql as $$
begin
    if p_ok is not true then
        raise exception 'ÉCHEC : %', p_case;
    end if;
end;
$$;

create function pg_temp.as_user(p_user uuid) returns void
language sql as $$
    select set_config(
        'request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text,
        true
    );
$$;

do $$
declare
    u uuid[] := array[]::uuid[];
    v_id uuid;
    v_comp uuid;
    v_league uuid;
    v_match uuid;
    v_state text;
    v_count int;
    v_reactions jsonb;
    v_profile public.profiles;
begin
    -- Filtre des pseudos -------------------------------------------------------
    perform pg_temp.expect(
        (select bool_and(public.username_is_clean(x))
         from unnest(array['constant', 'Scunthorpe_XV', 'supporter_rct', 'computer',
                           'violet', 'Montenegro_fan', 'therapist_33', 'hugo']) as x),
        'filtre : faux positif');
    perform pg_temp.expect(
        (select bool_and(not public.username_is_clean(x))
         from unnest(array['c0nnard', 'fils_de_pute', 'sale_pute', 'Admin42', 'con',
                           'rugby_nazi', 'TryCast_off', 'FUCK_it', 'support']) as x),
        'filtre : pseudo injurieux accepté');

    for i in 1..3 loop
        insert into auth.users (
            instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at
        )
        values (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
            'authenticated', 'e2e.modo' || i || '@trycast.local',
            jsonb_build_object('username', 'ModoUser' || i), now(), now()
        )
        returning id into v_id;
        u := u || v_id;
    end loop;

    begin
        update public.profiles set username = 'sale_pute' where id = u[1];
        v_state := 'ok';
    exception when check_violation then
        v_state := sqlstate;
    end;
    perform pg_temp.expect(v_state = '23514', 'filtre : update direct accepté');

    -- Données : ligue, match commencé, prono de u1, réactions de u2 et u3 --------
    insert into public.competitions (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
    values (-901, 2026, 'E2E Modo', 'e2e-modo', current_date - 30, current_date + 30, false)
    returning id into v_comp;

    insert into public.leagues (name, invite_code, owner_id, competition_id)
    values ('E2E Modo', 'MMMMMMMM', u[1], v_comp)
    returning id into v_league;

    insert into public.league_members (league_id, user_id)
    select v_league, x from unnest(u) as x;

    insert into public.matches (competition_id, api_game_id, kickoff_at, round, status)
    values (v_comp, -9901, now() - interval '1 hour', 'R1', 'in_play')
    returning id into v_match;

    insert into public.predictions (user_id, match_id, predicted_home_score, predicted_away_score)
    values (u[1], v_match, 20, 10);

    insert into public.prediction_reactions (league_id, match_id, target_user_id, reactor_id, reaction)
    values (v_league, v_match, u[1], u[2], 'bravo'),
           (v_league, v_match, u[1], u[3], 'lucky');

    -- Blocages -------------------------------------------------------------------
    perform pg_temp.as_user(u[3]);
    set local role authenticated;
    insert into public.user_blocks (blocker_id, blocked_id) values (u[3], u[2]);
    reset role;

    begin
        perform pg_temp.as_user(u[1]);
        set local role authenticated;
        insert into public.user_blocks (blocker_id, blocked_id) values (u[3], u[1]);
        v_state := 'ok';
    exception when insufficient_privilege then
        v_state := sqlstate;
    end;
    reset role;
    perform pg_temp.expect(v_state = '42501', 'blocage au nom d''un autre accepté');

    perform pg_temp.as_user(u[1]);
    set local role authenticated;
    select count(*) into v_count from public.user_blocks;
    reset role;
    perform pg_temp.expect(v_count = 0, 'blocages d''un autre lisibles');

    -- Réactions : u3 ne voit plus celle de u2, u1 voit les deux --------------------
    perform pg_temp.as_user(u[3]);
    set local role authenticated;
    select reactions into v_reactions
    from public.get_match_league_predictions(v_match, v_league) where user_id = u[1];
    select count(*) into v_count
    from public.get_prediction_reactors(v_league, v_match, u[1]);
    reset role;
    perform pg_temp.expect(v_reactions = '{"lucky": 1}'::jsonb, 'compteurs : réaction bloquée comptée');
    perform pg_temp.expect(v_count = 1, 'auteurs : réaction bloquée listée');

    perform pg_temp.as_user(u[1]);
    set local role authenticated;
    select reactions into v_reactions
    from public.get_match_league_predictions(v_match, v_league) where user_id = u[1];
    select count(*) into v_count
    from public.get_prediction_reactors(v_league, v_match, u[1]);
    reset role;
    perform pg_temp.expect(v_reactions = '{"bravo": 1, "lucky": 1}'::jsonb, 'compteurs : non-bloqueur privé de réactions');
    perform pg_temp.expect(v_count = 2, 'auteurs : non-bloqueur privé de réactions');

    -- Signalements ------------------------------------------------------------------
    perform pg_temp.as_user(u[1]);
    set local role authenticated;
    insert into public.user_reports (reporter_id, reported_id, reason) values (u[1], u[2], 'username');
    reset role;

    begin
        perform pg_temp.as_user(u[1]);
        set local role authenticated;
        insert into public.user_reports (reporter_id, reported_id, reason) values (u[1], u[2], 'username');
        v_state := 'ok';
    exception when unique_violation then
        v_state := sqlstate;
    end;
    reset role;
    perform pg_temp.expect(v_state = '23505', 'signalement en double accepté');

    begin
        perform pg_temp.as_user(u[1]);
        set local role authenticated;
        insert into public.user_reports (reporter_id, reported_id, reason) values (u[3], u[2], 'avatar');
        v_state := 'ok';
    exception when insufficient_privilege then
        v_state := sqlstate;
    end;
    reset role;
    perform pg_temp.expect(v_state = '42501', 'signalement au nom d''un autre accepté');

    begin
        perform pg_temp.as_user(u[1]);
        set local role authenticated;
        perform count(*) from public.user_reports;
        v_state := 'ok';
    exception when insufficient_privilege then
        v_state := sqlstate;
    end;
    reset role;
    perform pg_temp.expect(v_state = '42501', 'signalements lisibles par un client');

    -- Traitement --------------------------------------------------------------------
    begin
        perform pg_temp.as_user(u[1]);
        set local role authenticated;
        perform public.moderate_profile(u[2], true, false);
        v_state := 'ok';
    exception when insufficient_privilege then
        v_state := sqlstate;
    end;
    reset role;
    perform pg_temp.expect(v_state = '42501', 'moderate_profile ouverte aux clients');

    v_profile := public.moderate_profile(u[2], true, false);
    perform pg_temp.expect(
        v_profile.username = 'user_' || left(u[2]::text, 8) and not v_profile.username_chosen,
        'moderate_profile : pseudo non remis à zéro');
    perform pg_temp.expect(
        not exists (select 1 from public.user_reports where reported_id = u[2]),
        'moderate_profile : signalement traité non supprimé');
end;
$$;

select 'OK' as e2e_moderation;

rollback;
