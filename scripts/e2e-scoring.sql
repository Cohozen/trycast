-- Vérification E2E côté serveur de la RPC apply_match_scores (Lot 4) :
-- points, idempotence, garde-fous, passe 2. À exécuter sur le projet DEV
-- (SQL editor ou MCP execute_sql) après scripts/seed-test-scoring.sql.
-- Rejouable : rejouer le seed avant chaque exécution.
--
-- Points attendus sur le match -103 (24-17, cotes 1.5/21/2.8, barème v1) :
--   user1 (20-10 + bonus off domicile) : vainqueur 10×1.5=15, écart prédit 10
--   vs réel 7 → ±5 = +8, bonus off en attente → 23 pts, puis 27 en passe 2
--   (essais 4-1 : +25 % de 15 = 4)
--   user2 (10-20) : mauvais vainqueur → 0 pt

do $$
declare
    v_match uuid;
    v_match_futur uuid;
    v_p1 uuid; -- prono user1
    v_p2 uuid; -- prono user2
    v_pass1 jsonb;
    v_pass2 jsonb;
    v_points1 int;
    v_points2 int;
    v_scored_at timestamptz;
begin
    select m.id into v_match from public.matches m where m.api_game_id = -103;
    assert v_match is not null, 'seed manquant : exécuter scripts/seed-test-scoring.sql';
    select p.id into v_p1 from public.predictions p
        join auth.users u on u.id = p.user_id
        where p.match_id = v_match and u.email = 'e2e.user1@trycast.local';
    select p.id into v_p2 from public.predictions p
        join auth.users u on u.id = p.user_id
        where p.match_id = v_match and u.email = 'e2e.user2@trycast.local';
    assert v_p1 is not null and v_p2 is not null, 'pronos du seed introuvables';

    -- Payloads tels que les construirait l'EF (buildScoringPayload)
    v_pass1 := jsonb_build_array(
        jsonb_build_object(
            'prediction_id', v_p1, 'points_awarded', 23,
            'points_breakdown', '{"predictedOutcome":"home","winnerCorrect":true,
                "oddsUsed":1.5,"oddsFallback":false,"winnerPoints":15,
                "exactScorePoints":0,"gapPoints":8,"defensiveBonusPoints":0,
                "offensiveBonusPoints":0,"offensiveBonusPending":true}'::jsonb
        ),
        jsonb_build_object(
            'prediction_id', v_p2, 'points_awarded', 0,
            'points_breakdown', '{"predictedOutcome":"away","winnerCorrect":false,
                "oddsUsed":2.8,"oddsFallback":false,"winnerPoints":0,
                "exactScorePoints":0,"gapPoints":0,"defensiveBonusPoints":0,
                "offensiveBonusPoints":0,"offensiveBonusPending":false}'::jsonb
        )
    );

    -- Passe 1 : points écrits, match horodaté
    perform public.apply_match_scores(v_match, 1, v_pass1);
    select points_awarded into v_points1 from public.predictions where id = v_p1;
    select points_awarded into v_points2 from public.predictions where id = v_p2;
    assert v_points1 = 23, format('user1 : 23 pts attendus, %s obtenus', v_points1);
    assert v_points2 = 0, format('user2 : 0 pt attendu, %s obtenus', v_points2);
    select scored_at into v_scored_at from public.matches where id = v_match;
    assert v_scored_at is not null, 'matches.scored_at non posé';
    assert (select points_breakdown ->> 'offensiveBonusPending'
            from public.predictions where id = v_p1) = 'true',
        'bonus offensif user1 non marqué en attente';
    raise notice 'OK passe 1 : points écrits (user1=23, user2=0), match horodaté';

    -- Idempotence : rejouer le même payload reproduit le même état
    perform public.apply_match_scores(v_match, 1, v_pass1);
    select points_awarded into v_points1 from public.predictions where id = v_p1;
    assert v_points1 = 23, 'rejeu : points user1 modifiés';
    assert (select count(*) from public.predictions where match_id = v_match) = 2,
        'rejeu : nombre de pronos modifié';
    raise notice 'OK idempotence : rejeu sans effet';

    -- Couverture totale : payload partiel refusé
    begin
        perform public.apply_match_scores(v_match, 1, jsonb_build_array(v_pass1 -> 0));
        raise exception 'ECHEC_ATTENDU';
    exception when others then
        assert sqlerrm like '%pronos attendus%', format('payload partiel : %s', sqlerrm);
    end;
    raise notice 'OK garde-fou : payload partiel refusé';

    -- Match non terminé refusé (match e2e futur -101, seed-test-predictions)
    select m.id into v_match_futur from public.matches m where m.api_game_id = -101;
    if v_match_futur is not null then
        begin
            perform public.apply_match_scores(v_match_futur, 1, '[]'::jsonb);
            raise exception 'ECHEC_ATTENDU';
        exception when others then
            assert sqlerrm like '%non terminé%', format('match non terminé : %s', sqlerrm);
        end;
        raise notice 'OK garde-fou : match non terminé refusé';
    end if;

    -- Passe 2 : essais saisis (flux admin-set-tries), bonus offensif crédité
    update public.matches
    set home_tries = 4, away_tries = 1, tries_missing = false
    where id = v_match;
    v_pass2 := jsonb_set(
        jsonb_set(v_pass1, '{0,points_awarded}', '27'),
        '{0,points_breakdown}',
        '{"predictedOutcome":"home","winnerCorrect":true,
          "oddsUsed":1.5,"oddsFallback":false,"winnerPoints":15,
          "exactScorePoints":0,"gapPoints":8,"defensiveBonusPoints":0,
          "offensiveBonusPoints":4,"offensiveBonusPending":false}'::jsonb
    );
    perform public.apply_match_scores(v_match, 1, v_pass2);
    select points_awarded into v_points1 from public.predictions where id = v_p1;
    assert v_points1 = 27, format('passe 2 user1 : 27 pts attendus, %s obtenus', v_points1);
    assert (select points_breakdown ->> 'offensiveBonusPending'
            from public.predictions where id = v_p1) = 'false',
        'passe 2 : bonus offensif toujours en attente';
    raise notice 'OK passe 2 : bonus offensif crédité (27 pts), pending éteint';

    raise notice 'Tous les tests E2E serveur du scoring sont passés.';
end $$;
