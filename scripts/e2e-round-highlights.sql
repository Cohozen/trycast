-- Vérification E2E côté serveur du coup de la journée (migration
-- 20260922000100_round_highlights.sql) : calcul, garde d'appartenance, cibles
-- de la notification, contraintes du journal des envois.
--
-- AUTONOME ET SANS TRACE : tout se passe dans une transaction annulée à la fin
-- (utilisateurs, compétition active, ligue, matchs, pronos, tokens). Aucun seed
-- préalable. Sur le projet DEV uniquement :
--   supabase db query --linked -f scripts/e2e-round-highlights.sql
-- Succès = une ligne « OK » ; un échec lève une exception qui nomme le cas.
--
-- Ligue de 5 membres (u1..u5), u6 hors ligue. Journées :
--   C1 : u1 seul contre 4 (cote 3.0, joker ×2, score exact) → u1, 120 pts ;
--        u6 (hors ligue) a mieux, ignoré ; match B où la ligue avait raison
--   C2 : u1 et u2 contre 3 → 2 lauréats ex æquo
--   C3 : 2 + 2 gagnants à égalité sur deux matchs → 4 ex æquo → rien
--   C4 : 2 pronos seulement (1 contre 1) → rien
--   C5 : un bonus offensif en attente dans la ligue → rien
--   C6 : nul pronostiqué contre la ligue + un match reporté ignoré → u1
--   C7 : un match encore à jouer → rien
--   C8 : coup valide mais journée jouée il y a 10 jours → absent des cibles
--   étape « final » (competition_stages) : u2 → clé stage:final

begin;

create function pg_temp.expect(p_ok boolean, p_case text) returns void
language plpgsql as $$
begin
    if p_ok is not true then
        raise exception 'ÉCHEC : %', p_case;
    end if;
end;
$$;

create function pg_temp.mk_match(
    p_comp uuid, p_game int, p_round text, p_status text, p_hs int, p_as int,
    p_kickoff timestamptz, p_oh numeric default 2, p_oa numeric default 2,
    p_source text default 'default'
) returns uuid
language sql as $$
    insert into public.matches (
        competition_id, api_game_id, round, status, home_score, away_score,
        kickoff_at, scored_at, odds_home, odds_draw, odds_away, odds_source
    )
    values (
        p_comp, p_game, p_round, p_status::public.match_status, p_hs, p_as,
        p_kickoff, case when p_status = 'finished' then now() end,
        p_oh, 20, p_oa, p_source
    )
    returning id;
$$;

create function pg_temp.pr(
    p_match uuid, p_user uuid, p_h int, p_a int, p_pts int,
    p_bd jsonb default '{"offensiveBonusPending": false}'
) returns void
language sql as $$
    insert into public.predictions (
        user_id, match_id, predicted_home_score, predicted_away_score,
        points_awarded, points_breakdown, scoring_rule_version, scored_at
    )
    values (p_user, p_match, p_h, p_a, p_pts, p_bd, 2, now());
$$;

do $$
declare
    u uuid[] := array[]::uuid[];
    v_id uuid;
    v_comp uuid;
    v_league uuid;
    m uuid;
    v_anchor uuid;
    v_count int;
    r record;
begin
    for i in 1..6 loop
        insert into auth.users (
            instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at
        )
        values (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
            'authenticated', 'e2e.coup' || i || '@trycast.local',
            jsonb_build_object('username', 'CoupUser' || i), now(), now()
        )
        returning id into v_id;
        u := u || v_id;
    end loop;

    insert into public.competitions (api_league_id, api_season, name, slug, starts_on, ends_on, is_active)
    values (-900, 2026, 'E2E Coup', 'e2e-coup', current_date - 30, current_date + 30, true)
    returning id into v_comp;

    insert into public.leagues (name, invite_code, owner_id, competition_id)
    values ('E2E Coup', 'CCCCCCCC', u[1], v_comp)
    returning id into v_league;

    insert into public.league_members (league_id, user_id)
    select v_league, x from unnest(u[1:5]) as x;

    -- C1 : u1 seul contre la ligue, outsider, joker, score exact
    m := pg_temp.mk_match(v_comp, -9101, 'C1', 'finished', 20, 10, now() - interval '1 day', 3.0, 1.4, 'api');
    perform pg_temp.pr(m, u[1], 20, 10, 120, '{"jokerMultiplier": 2, "offensiveBonusPending": false}');
    perform pg_temp.pr(m, u[2], 10, 20, 0);
    perform pg_temp.pr(m, u[3], 10, 20, 0);
    perform pg_temp.pr(m, u[4], 10, 20, 0);
    perform pg_temp.pr(m, u[5], 10, 20, 0);
    perform pg_temp.pr(m, u[6], 20, 10, 200); -- hors ligue
    m := pg_temp.mk_match(v_comp, -9102, 'C1', 'finished', 25, 5, now() - interval '1 day');
    for i in 1..5 loop
        perform pg_temp.pr(m, u[i], 25, 10, 30);
    end loop;

    -- C2 : deux ex æquo
    m := pg_temp.mk_match(v_comp, -9103, 'C2', 'finished', 10, 20, now() - interval '1 day', 1.5, 2.5, 'api');
    perform pg_temp.pr(m, u[1], 12, 18, 15);
    perform pg_temp.pr(m, u[2], 12, 18, 15);
    perform pg_temp.pr(m, u[3], 20, 10, 0);
    perform pg_temp.pr(m, u[4], 20, 10, 0);
    perform pg_temp.pr(m, u[5], 20, 10, 0);

    -- C3 : quatre ex æquo sur deux matchs
    m := pg_temp.mk_match(v_comp, -9104, 'C3', 'finished', 20, 10, now() - interval '1 day');
    perform pg_temp.pr(m, u[1], 20, 15, 10);
    perform pg_temp.pr(m, u[2], 20, 15, 10);
    perform pg_temp.pr(m, u[3], 10, 20, 0);
    perform pg_temp.pr(m, u[4], 10, 20, 0);
    perform pg_temp.pr(m, u[5], 10, 20, 0);
    m := pg_temp.mk_match(v_comp, -9105, 'C3', 'finished', 20, 10, now() - interval '1 day');
    perform pg_temp.pr(m, u[3], 20, 15, 10);
    perform pg_temp.pr(m, u[4], 20, 15, 10);
    perform pg_temp.pr(m, u[1], 10, 20, 0);
    perform pg_temp.pr(m, u[2], 10, 20, 0);
    perform pg_temp.pr(m, u[5], 10, 20, 0);

    -- C4 : 1 contre 1
    m := pg_temp.mk_match(v_comp, -9106, 'C4', 'finished', 20, 10, now() - interval '1 day');
    perform pg_temp.pr(m, u[1], 20, 10, 40);
    perform pg_temp.pr(m, u[2], 10, 20, 0);

    -- C5 : bonus offensif en attente
    m := pg_temp.mk_match(v_comp, -9107, 'C5', 'finished', 20, 10, now() - interval '1 day');
    perform pg_temp.pr(m, u[1], 20, 15, 25);
    perform pg_temp.pr(m, u[2], 10, 20, 0);
    perform pg_temp.pr(m, u[3], 10, 20, 0);
    perform pg_temp.pr(m, u[4], 10, 20, 0);
    perform pg_temp.pr(m, u[5], 10, 20, 0, '{"offensiveBonusPending": true}');

    -- C6 : nul contre la ligue, un match reporté ignoré
    m := pg_temp.mk_match(v_comp, -9108, 'C6', 'finished', 15, 15, now() - interval '1 day');
    perform pg_temp.pr(m, u[1], 15, 15, 50);
    perform pg_temp.pr(m, u[2], 20, 10, 0);
    perform pg_temp.pr(m, u[3], 20, 10, 0);
    perform pg_temp.pr(m, u[4], 10, 20, 0);
    perform pg_temp.pr(m, u[5], 20, 10, 0);
    perform pg_temp.mk_match(v_comp, -9109, 'C6', 'postponed', null, null, now() - interval '1 day');

    -- C7 : journée pas finie
    m := pg_temp.mk_match(v_comp, -9110, 'C7', 'finished', 20, 10, now() - interval '1 day');
    perform pg_temp.pr(m, u[1], 20, 15, 25);
    perform pg_temp.pr(m, u[2], 10, 20, 0);
    perform pg_temp.pr(m, u[3], 10, 20, 0);
    perform pg_temp.pr(m, u[4], 10, 20, 0);
    perform pg_temp.mk_match(v_comp, -9111, 'C7', 'scheduled', null, null, now() + interval '1 day');

    -- C8 : jouée il y a 10 jours (re-scoring récent)
    m := pg_temp.mk_match(v_comp, -9112, 'C8', 'finished', 20, 10, now() - interval '10 days');
    perform pg_temp.pr(m, u[1], 20, 15, 25);
    perform pg_temp.pr(m, u[2], 10, 20, 0);
    perform pg_temp.pr(m, u[3], 10, 20, 0);
    perform pg_temp.pr(m, u[4], 10, 20, 0);

    -- Étape « final » : regroupée par stage_key, round brut ignoré
    insert into public.competition_stages (competition_id, key, kind, starts_at, ends_at, sort)
    values (v_comp, 'final', 'final', now() - interval '3 days', now() - interval '2 days', 1);
    m := pg_temp.mk_match(v_comp, -9113, '99', 'finished', 10, 20, now() - interval '60 hours');
    perform pg_temp.pr(m, u[2], 15, 20, 30);
    perform pg_temp.pr(m, u[1], 20, 10, 0);
    perform pg_temp.pr(m, u[3], 20, 10, 0);
    perform pg_temp.pr(m, u[4], 20, 10, 0);

    -- ─── Calcul ──────────────────────────────────────────────────────────────
    select count(*) into v_count from public.league_round_highlights(v_league);
    perform pg_temp.expect(v_count = 6, format('6 lauréats attendus, %s obtenus', v_count));

    select * into r from public.league_round_highlights(v_league) h where h.round = 'C1';
    perform pg_temp.expect(r.user_id = u[1] and r.points = 120, 'C1 : u1 à 120 pts (u6 hors ligue ignoré)');
    perform pg_temp.expect(r.is_joker and r.is_exact and r.is_outsider and not r.is_draw, 'C1 : joker, exact, outsider');
    perform pg_temp.expect(r.crowd_outcome = 'away' and r.crowd_count = 4, 'C1 : 4 voyaient l''extérieur');
    perform pg_temp.expect(r.winners_count = 1 and r.predictions_count = 5, 'C1 : 1 sur 5');
    perform pg_temp.expect(r.round_key = 'C1', 'C1 : clé de journée');

    select count(*) into v_count from public.league_round_highlights(v_league) h where h.round = 'C2';
    perform pg_temp.expect(v_count = 2, 'C2 : deux ex æquo');
    select * into r from public.league_round_highlights(v_league) h where h.round = 'C2' limit 1;
    perform pg_temp.expect(r.is_outsider and not r.is_joker and not r.is_exact, 'C2 : outsider sans joker');

    select count(*) into v_count from public.league_round_highlights(v_league) h
    where h.round in ('C3', 'C4', 'C5', 'C7');
    perform pg_temp.expect(v_count = 0, 'C3/C4/C5/C7 : aucun coup');

    select * into r from public.league_round_highlights(v_league) h where h.round = 'C6';
    perform pg_temp.expect(r.user_id = u[1] and r.is_draw and r.is_exact and not r.is_outsider, 'C6 : nul osé, cotes par défaut');
    perform pg_temp.expect(r.crowd_outcome = 'home' and r.crowd_count = 3, 'C6 : 3 voyaient le domicile');

    select * into r from public.league_round_highlights(v_league) h where h.stage_key = 'final';
    perform pg_temp.expect(r.user_id = u[2] and r.round is null and r.round_key = 'stage:final' and r.stage_kind = 'final', 'étape : clé stage:final');

    -- ─── Garde d'appartenance ────────────────────────────────────────────────
    perform set_config('request.jwt.claims', json_build_object('sub', u[6], 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into v_count from public.get_league_round_highlights(v_league);
    reset role;
    perform pg_temp.expect(v_count = 0, 'non-membre : 0 ligne');

    perform set_config('request.jwt.claims', json_build_object('sub', u[3], 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into v_count from public.get_league_round_highlights(v_league);
    reset role;
    perform pg_temp.expect(v_count = 6, format('membre : 6 lignes, %s obtenues', v_count));

    -- ─── Cibles de la notification ───────────────────────────────────────────
    insert into public.push_tokens (user_id, token, platform)
    values (u[1], 'ExponentPushToken[e2e-coup-1]', 'ios'),
           (u[2], 'ExponentPushToken[e2e-coup-2]', 'android'),
           (u[6], 'ExponentPushToken[e2e-coup-6]', 'android');

    select count(*) into v_count from public.notify_round_highlight_targets() t where t.league_id = v_league;
    perform pg_temp.expect(v_count = 8, format('cibles : 4 journées × 2 membres équipés, %s obtenues', v_count));

    select count(*) into v_count from public.notify_round_highlight_targets() t
    where t.league_id = v_league and t.is_laureate;
    perform pg_temp.expect(v_count = 5, 'cibles : u1 lauréat en C1/C2/C6, u2 en C2/final');

    select count(*) into v_count from public.notify_round_highlight_targets() t
    where t.league_id = v_league and t.is_laureate and t.user_id = u[1];
    perform pg_temp.expect(v_count = 3, 'cibles : u1 lauréat 3 fois');

    insert into public.notification_prefs (user_id, round_highlight_enabled) values (u[2], false);
    select count(*) into v_count from public.notify_round_highlight_targets() t where t.league_id = v_league;
    perform pg_temp.expect(v_count = 4, 'préférence coupée : u2 n''est plus ciblé');

    select t.anchor_match_id into v_anchor from public.notify_round_highlight_targets() t
    where t.league_id = v_league and t.round_key = 'C1';
    perform pg_temp.expect(v_anchor = (select id from public.matches where api_game_id = -9102)
        or v_anchor = (select id from public.matches where api_game_id = -9101), 'ancre = un match de C1');
    insert into public.notification_sends (user_id, match_id, type, league_id, status)
    values (u[1], v_anchor, 'round_highlight', v_league, 'sent');
    select count(*) into v_count from public.notify_round_highlight_targets() t where t.league_id = v_league;
    perform pg_temp.expect(v_count = 3, 'déjà envoyé : C1 ne revient pas');

    -- ─── Contraintes du journal ──────────────────────────────────────────────
    begin
        insert into public.notification_sends (user_id, match_id, type, league_id)
        values (u[1], v_anchor, 'round_highlight', v_league);
        perform pg_temp.expect(false, 'doublon de coup accepté');
    exception when unique_violation then null;
    end;

    insert into public.notification_sends (user_id, match_id, type) values (u[1], v_anchor, 'result');
    begin
        insert into public.notification_sends (user_id, match_id, type) values (u[1], v_anchor, 'result');
        perform pg_temp.expect(false, 'doublon de résultat accepté (league_id null)');
    exception when unique_violation then null;
    end;

    begin
        insert into public.notification_sends (user_id, match_id, type) values (u[1], v_anchor, 'round_highlight');
        perform pg_temp.expect(false, 'coup sans ligue accepté');
    exception when check_violation then null;
    end;
end;
$$;

select 'OK' as e2e_round_highlights;

rollback;
