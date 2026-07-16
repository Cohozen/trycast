-- Pages ligues (2026-07-16) : onglet « Résultats » du détail de ligue —
-- points des membres par journée (matches.round).
--
-- La RLS de predictions ne laisse lire que SES pronos → security definer,
-- garde d'appartenance explicite (is_league_member), 0 ligne pour un
-- non-membre : même anti-énumération silencieuse que get_league_leaderboard.
-- Aucun prono individuel n'est exposé, seulement des sommes par journée — et
-- uniquement sur des matchs déjà entamés (une journée n'apparaît que si au
-- moins un de ses matchs est finished, comme computePointsByRound côté
-- profil ; seuls les pronos réconciliés — scored_at — comptent).
--
-- Tous les membres figurent dans chaque journée entamée (0 pt sans prono),
-- comme le leaderboard de ligue : la liste colle à l'effectif. Le critère
-- « score exact » est celui de standings (20260708000100/200) — toute
-- évolution du critère doit toucher les trois fichiers. first_kickoff sert
-- d'ordre chronologique des journées (jamais alphabétique : « 10 » < « 2 »).
-- Le rang par journée se calcule côté client (points desc > exacts desc).

create or replace function public.get_league_round_points(p_league_id uuid)
returns table (
    round text,
    first_kickoff timestamptz,
    user_id uuid,
    username text,
    avatar_url text,
    points int,
    exact_scores int
)
language sql
stable
security definer
set search_path = ''
as $$
    with league as (
        select l.id, l.competition_id
        from public.leagues l
        where l.id = p_league_id and public.is_league_member(p_league_id)
    ),
    rounds as (
        -- Journées entamées : au moins un match terminé
        select m.round, min(m.kickoff_at) as first_kickoff
        from public.matches m
        join league lg on lg.competition_id = m.competition_id
        where m.status = 'finished'
        group by m.round
    ),
    scored as (
        -- Pronos réconciliés des seuls membres de la ligue
        select m.round, p.user_id, p.points_awarded,
            (p.predicted_home_score = m.home_score
                and p.predicted_away_score = m.away_score) as is_exact
        from public.predictions p
        join public.matches m on m.id = p.match_id
        join league lg on lg.competition_id = m.competition_id
        join public.league_members lm
            on lm.league_id = p_league_id and lm.user_id = p.user_id
        where p.scored_at is not null
    )
    select
        r.round,
        r.first_kickoff,
        lm.user_id,
        pr.username,
        pr.avatar_url,
        coalesce(sum(s.points_awarded), 0)::int as points,
        (count(*) filter (where s.is_exact))::int as exact_scores
    from public.league_members lm
    join league lg on lg.id = lm.league_id
    join public.profiles pr on pr.id = lm.user_id
    cross join rounds r
    left join scored s
        on s.user_id = lm.user_id
        -- round est nullable : is not distinct from apparie aussi les null
        and s.round is not distinct from r.round
    where lm.league_id = p_league_id
    group by r.round, r.first_kickoff, lm.user_id, pr.username, pr.avatar_url
    order by r.first_kickoff, points desc, exact_scores desc, lower(pr.username);
$$;

-- Les fonctions naissent exécutables par public
revoke execute on function public.get_league_round_points (uuid) from public, anon;
grant execute on function public.get_league_round_points (uuid) to authenticated;
