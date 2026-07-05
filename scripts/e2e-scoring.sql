-- Vérification E2E côté serveur de la RPC apply_match_scores : points,
-- idempotence, garde-fous, passe 2 (Lot 4) + ré-agrégation standings (Lot 5).
-- À exécuter sur le projet DEV (SQL editor ou MCP execute_sql) après
-- scripts/seed-test-scoring.sql. Rejouable : rejouer le seed avant chaque
-- exécution.
--
-- Points attendus sur le match -103 (24-17, cotes 1.5/21/2.8, barème v1) :
--   user1 (20-10 + bonus off domicile) : vainqueur 10×1.5=15, écart prédit 10
--   vs réel 7 → ±5 = +8, bonus off en attente → 23 pts, puis 27 en passe 2
--   (essais 4-1 : +25 % de 15 = 4)
--   user2 (10-20) : mauvais vainqueur → 0 pt
-- Points attendus sur le match -104 (30-3, cotes 1.2/15/5.0) :
--   user1 (30-3) : vainqueur 10×1.2=12, score exact +50 → 62 pts
-- Standings attendus (compétition e2e-test) :
--   après passe 1 -103 : user1 (23, 1, 0), user2 (0, 1, 0)
--   après passe 2 -103 : user1 (27, 1, 0)
--   après scoring -104 : user1 (89, 2, 1), user2 inchangé

do $$
declare
    v_comp uuid;
    v_match uuid;
    v_match2 uuid; -- match -104 (score exact)
    v_match_futur uuid;
    v_p1 uuid; -- prono user1 sur -103
    v_p2 uuid; -- prono user2 sur -103
    v_p3 uuid; -- prono user1 sur -104
    v_u1 uuid;
    v_u2 uuid;
    v_pass1 jsonb;
    v_pass2 jsonb;
    v_points1 int;
    v_points2 int;
    v_scored_at timestamptz;
    v_standing record;
begin
    select c.id into v_comp from public.competitions c where c.slug = 'e2e-test';
    select m.id into v_match from public.matches m where m.api_game_id = -103;
    select m.id into v_match2 from public.matches m where m.api_game_id = -104;
    assert v_match is not null and v_match2 is not null,
        'seed manquant : exécuter scripts/seed-test-scoring.sql';
    select u.id into v_u1 from auth.users u where u.email = 'e2e.user1@trycast.local';
    select u.id into v_u2 from auth.users u where u.email = 'e2e.user2@trycast.local';
    select p.id into v_p1 from public.predictions p
        where p.match_id = v_match and p.user_id = v_u1;
    select p.id into v_p2 from public.predictions p
        where p.match_id = v_match and p.user_id = v_u2;
    select p.id into v_p3 from public.predictions p
        where p.match_id = v_match2 and p.user_id = v_u1;
    assert v_p1 is not null and v_p2 is not null and v_p3 is not null,
        'pronos du seed introuvables';

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

    -- Standings après passe 1 : agrégat absolu par user
    select total_points, predictions_scored, exact_scores into v_standing
        from public.standings where user_id = v_u1 and competition_id = v_comp;
    assert v_standing = (23, 1, 0),
        format('standings user1 passe 1 : (23,1,0) attendu, %s obtenu', v_standing);
    select total_points, predictions_scored, exact_scores into v_standing
        from public.standings where user_id = v_u2 and competition_id = v_comp;
    assert v_standing = (0, 1, 0),
        format('standings user2 passe 1 : (0,1,0) attendu, %s obtenu', v_standing);
    raise notice 'OK standings passe 1 : user1 (23,1,0), user2 (0,1,0)';

    -- Idempotence : rejouer le même payload reproduit le même état
    perform public.apply_match_scores(v_match, 1, v_pass1);
    select points_awarded into v_points1 from public.predictions where id = v_p1;
    assert v_points1 = 23, 'rejeu : points user1 modifiés';
    assert (select count(*) from public.predictions where match_id = v_match) = 2,
        'rejeu : nombre de pronos modifié';
    select total_points, predictions_scored, exact_scores into v_standing
        from public.standings where user_id = v_u1 and competition_id = v_comp;
    assert v_standing = (23, 1, 0), 'rejeu : standings user1 modifiés';
    assert (select count(*) from public.standings where competition_id = v_comp) = 2,
        'rejeu : nombre de lignes standings modifié';
    raise notice 'OK idempotence : rejeu sans effet (points et standings)';

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
    select total_points, predictions_scored, exact_scores into v_standing
        from public.standings where user_id = v_u1 and competition_id = v_comp;
    assert v_standing = (27, 1, 0),
        format('standings user1 passe 2 : (27,1,0) attendu, %s obtenu', v_standing);
    raise notice 'OK passe 2 : bonus offensif crédité (27 pts), standings (27,1,0)';

    -- Match -104 (score exact) : agrégat multi-matchs + compteur exact_scores.
    -- Seul user1 a un prono → la ligne de user2 ne doit pas bouger.
    perform public.apply_match_scores(v_match2, 1, jsonb_build_array(
        jsonb_build_object(
            'prediction_id', v_p3, 'points_awarded', 62,
            'points_breakdown', '{"predictedOutcome":"home","winnerCorrect":true,
                "oddsUsed":1.2,"oddsFallback":false,"winnerPoints":12,
                "exactScorePoints":50,"gapPoints":0,"defensiveBonusPoints":0,
                "offensiveBonusPoints":0,"offensiveBonusPending":false}'::jsonb
        )
    ));
    select total_points, predictions_scored, exact_scores into v_standing
        from public.standings where user_id = v_u1 and competition_id = v_comp;
    assert v_standing = (89, 2, 1),
        format('standings user1 après -104 : (89,2,1) attendu, %s obtenu', v_standing);
    select total_points, predictions_scored, exact_scores into v_standing
        from public.standings where user_id = v_u2 and competition_id = v_comp;
    assert v_standing = (0, 1, 0),
        format('standings user2 après -104 : (0,1,0) attendu, %s obtenu', v_standing);
    raise notice 'OK match -104 : agrégat multi-matchs (89,2,1), exact_scores compté, user2 intact';

    raise notice 'Tous les tests E2E serveur du scoring sont passés.';
end $$;
