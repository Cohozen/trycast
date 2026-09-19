-- Réactions : les deux portes de lecture.
--
-- 1) get_match_league_predictions gagne les compteurs de réactions de chaque
--    prono (`reactions`, ex. {"bravo":3,"lucky":1}, {} sans réaction) et ma
--    propre réaction (`my_reaction`, null sinon) : une seule requête pour la
--    liste, pas d'appel par ligne. Les réactions d'anciens membres y sont
--    comptées (décision 2026-09-19 : elles survivent au départ).
--    La signature de retour change : drop + create et grants rejoués, comme
--    20260918000300. Les clients déjà distribués ignorent les colonnes en plus.
--
-- 2) get_prediction_reactors : qui a réagi, et avec quoi, au prono d'un
--    membre — chargée à l'ouverture de la sheet seulement. Un auteur qui a
--    quitté la ligue est ANONYMISÉ (user_id, username, avatar_url à null,
--    is_member false) : les membres restants n'ont plus à voir son identité.
--
-- Mêmes gardes que le prono : appelant membre de la ligue, match de la
-- compétition de la ligue, coup d'envoi passé — sinon 0 ligne, sans erreur.

drop function if exists public.get_match_league_predictions (uuid, uuid);

create function public.get_match_league_predictions(
    p_match_id uuid,
    p_league_id uuid
) returns table (
    user_id uuid,
    username text,
    avatar_url text,
    predicted_home_score int,
    predicted_away_score int,
    predicted_bonus_off_home boolean,
    predicted_bonus_off_away boolean,
    points_awarded int,
    is_joker boolean,
    reactions jsonb,
    my_reaction text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        lm.user_id,
        pr.username,
        pr.avatar_url,
        p.predicted_home_score,
        p.predicted_away_score,
        p.predicted_bonus_off_home,
        p.predicted_bonus_off_away,
        p.points_awarded,
        exists (
            select 1 from public.phase_jokers j
            where j.user_id = lm.user_id and j.match_id = m.id
        ) as is_joker,
        coalesce((
            select jsonb_object_agg(c.reaction, c.n)
            from (
                select r.reaction, count(*) as n
                from public.prediction_reactions r
                where r.league_id = p_league_id
                    and r.match_id = m.id
                    and r.target_user_id = lm.user_id
                group by r.reaction
            ) c
        ), '{}'::jsonb) as reactions,
        (
            select r.reaction from public.prediction_reactions r
            where r.league_id = p_league_id
                and r.match_id = m.id
                and r.target_user_id = lm.user_id
                and r.reactor_id = (select auth.uid())
        ) as my_reaction
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    join public.profiles pr on pr.id = lm.user_id
    join public.matches m
        on m.id = p_match_id
        and m.competition_id = l.competition_id
    left join public.predictions p
        on p.user_id = lm.user_id and p.match_id = m.id
    where lm.league_id = p_league_id
        and public.is_league_member(p_league_id)
        and now() >= m.kickoff_at
    order by p.points_awarded desc nulls last, lower(pr.username);
$$;

revoke execute on function public.get_match_league_predictions (uuid, uuid) from public, anon;
grant execute on function public.get_match_league_predictions (uuid, uuid) to authenticated;

create or replace function public.get_prediction_reactors(
    p_league_id uuid,
    p_match_id uuid,
    p_target_user_id uuid
) returns table (
    user_id uuid,
    username text,
    avatar_url text,
    reaction text,
    is_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        case when lm.user_id is not null then r.reactor_id end,
        case when lm.user_id is not null then pr.username end,
        case when lm.user_id is not null then pr.avatar_url end,
        r.reaction,
        lm.user_id is not null
    from public.prediction_reactions r
    join public.leagues l on l.id = r.league_id
    join public.matches m
        on m.id = r.match_id
        and m.competition_id = l.competition_id
    join public.profiles pr on pr.id = r.reactor_id
    left join public.league_members lm
        on lm.league_id = r.league_id and lm.user_id = r.reactor_id
    where r.league_id = p_league_id
        and r.match_id = p_match_id
        and r.target_user_id = p_target_user_id
        and public.is_league_member(p_league_id)
        and now() >= m.kickoff_at
    -- Ordre d'affichage des réactions, puis la mienne en tête, puis les
    -- membres par pseudo, les anciens membres en dernier.
    order by
        array_position(array['bravo', 'lucky', 'bold', 'laugh'], r.reaction),
        (r.reactor_id = (select auth.uid())) desc,
        (lm.user_id is null),
        lower(pr.username);
$$;

revoke execute on function public.get_prediction_reactors (uuid, uuid, uuid) from public, anon;
grant execute on function public.get_prediction_reactors (uuid, uuid, uuid) to authenticated;
