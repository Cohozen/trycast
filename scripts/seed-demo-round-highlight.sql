-- Données de démonstration du coup de la journée, sur le projet DEV seulement,
-- dans la ligue de démo « Les Potes » (code DEMERCT2, compétition nc-2026) :
--   supabase db query --linked -f scripts/seed-demo-round-highlight.sql
-- Rejouable (valeurs posées, pas incrémentées).
--
-- Journée 3 : Sacha seul contre la ligue sur Japon 24–21 France, score exact,
--   Japon outsider des cotes (3,1 contre 1,4), joker posé → « Le coup parfait ».
-- Journée 2 : Cohozen et Margot ex æquo contre la ligue sur Afrique du Sud
--   27–19 Écosse → « Deux à contre-courant », variante « moi » pour Cohozen.
--
-- Les matchs des journées 2 et 3 sont marqués scorés (scored_at) pour que les
-- journées soient complètes. Ils datent de juillet : la borne de 7 jours de
-- notify_round_highlight_targets empêche toute notification. Les pronos gardent
-- scoring_rule_version à null, hors de la sélection D de sync-results (sinon
-- le re-scoring écraserait ces points posés à la main).

do $$
declare
    v_league uuid := (select id from public.leagues where invite_code = 'DEMERCT2');
    v_jpn_fra uuid := (select id from public.matches where api_game_id = 45296110);
    v_rsa_sco uuid := (select id from public.matches where api_game_id = 45293557);
begin
    if v_league is null or v_jpn_fra is null or v_rsa_sco is null then
        raise exception 'Ligue DEMERCT2 ou matchs nc-2026 absents : projet dev attendu';
    end if;

    update public.matches m
    set scored_at = coalesce(m.scored_at, m.kickoff_at + interval '2 hours')
    from public.competitions c
    where c.id = m.competition_id and c.slug = 'nc-2026'
        and m.round in ('2', '3') and m.status = 'finished';

    update public.matches
    set odds_home = 3.1, odds_away = 1.4, odds_source = 'api'
    where id = v_jpn_fra;

    -- Pose ou remplace le prono des membres de la ligue, par pseudo
    insert into public.predictions (
        user_id, match_id, predicted_home_score, predicted_away_score,
        points_awarded, points_breakdown, scored_at
    )
    select pr.id, x.match_id, x.ph, x.pa, x.pts, x.bd::jsonb, now()
    from (values
        ('Sacha', v_jpn_fra, 24, 21, 140, '{"winnerCorrect": true, "exactScorePoints": 50, "jokerMultiplier": 2, "offensiveBonusPending": false}'),
        ('DemoTryCast', v_jpn_fra, 21, 24, 0, '{"winnerCorrect": false, "offensiveBonusPending": false}'),
        ('Margot', v_jpn_fra, 20, 25, 0, '{"winnerCorrect": false, "offensiveBonusPending": false}'),
        ('Cohozen', v_jpn_fra, 18, 22, 0, '{"winnerCorrect": false, "offensiveBonusPending": false}'),
        ('Cohozen', v_rsa_sco, 27, 20, 45, '{"winnerCorrect": true, "offensiveBonusPending": false}'),
        ('Margot', v_rsa_sco, 25, 19, 45, '{"winnerCorrect": true, "offensiveBonusPending": false}'),
        ('DemoTryCast', v_rsa_sco, 18, 22, 0, '{"winnerCorrect": false, "offensiveBonusPending": false}'),
        ('Sacha', v_rsa_sco, 15, 24, 0, '{"winnerCorrect": false, "offensiveBonusPending": false}'),
        ('TestUser1', v_rsa_sco, 20, 24, 0, '{"winnerCorrect": false, "offensiveBonusPending": false}')
    ) as x (username, match_id, ph, pa, pts, bd)
    join public.profiles pr on pr.username = x.username
    join public.league_members lm on lm.league_id = v_league and lm.user_id = pr.id
    on conflict (user_id, match_id) do update
    set predicted_home_score = excluded.predicted_home_score,
        predicted_away_score = excluded.predicted_away_score,
        points_awarded = excluded.points_awarded,
        points_breakdown = excluded.points_breakdown,
        scored_at = excluded.scored_at;

    -- Le joker de Sacha, pour que le ×2 apparaisse aussi dans le détail du match
    insert into public.phase_jokers (user_id, phase_id, match_id)
    select pr.id, cp.id, m.id
    from public.matches m
    join public.competition_phases cp
        on cp.competition_id = m.competition_id
        and m.kickoff_at >= cp.starts_at and m.kickoff_at < cp.ends_at
    join public.profiles pr on pr.username = 'Sacha'
    where m.id = v_jpn_fra
    on conflict (user_id, phase_id) do update set match_id = excluded.match_id;
end;
$$;

select round_key, username, points, is_joker, is_exact, is_outsider
from public.league_round_highlights((select id from public.leagues where invite_code = 'DEMERCT2'));
