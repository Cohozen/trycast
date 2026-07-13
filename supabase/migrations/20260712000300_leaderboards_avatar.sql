-- Ajoute avatar_url au type de retour des deux classements pour afficher la
-- photo de profil dans les podiums et lignes de classement. Le type de retour
-- d'une fonction SQL ne se modifie pas par create or replace → drop + create.
-- Logique de tri/rang/tie-breakers inchangée (cf. 20260708000500) ; seul
-- pr.avatar_url s'ajoute à la projection.

drop function if exists public.get_global_leaderboard (uuid, int, int);
drop function if exists public.get_league_leaderboard (uuid, int, int);

create function public.get_global_leaderboard(
    p_competition_id uuid,
    p_limit int default 50,
    p_offset int default 0
) returns table (
    rank bigint,
    user_id uuid,
    username text,
    avatar_url text,
    total_points int,
    exact_scores int,
    predictions_scored int
)
language sql
stable
security invoker
set search_path = ''
as $$
    select
        rank() over (
            order by s.total_points desc, s.exact_scores desc, s.predictions_scored asc
        ) as rank,
        s.user_id,
        pr.username,
        pr.avatar_url,
        s.total_points,
        s.exact_scores,
        s.predictions_scored
    from public.standings s
    join public.profiles pr on pr.id = s.user_id
    where s.competition_id = p_competition_id
    order by rank, lower(pr.username)
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.get_league_leaderboard(
    p_league_id uuid,
    p_limit int default 50,
    p_offset int default 0
) returns table (
    rank bigint,
    user_id uuid,
    username text,
    avatar_url text,
    total_points int,
    exact_scores int,
    predictions_scored int
)
language sql
stable
security invoker
set search_path = ''
as $$
    select
        rank() over (
            order by
                coalesce(s.total_points, 0) desc,
                coalesce(s.exact_scores, 0) desc,
                coalesce(s.predictions_scored, 0) asc
        ) as rank,
        lm.user_id,
        pr.username,
        pr.avatar_url,
        coalesce(s.total_points, 0) as total_points,
        coalesce(s.exact_scores, 0) as exact_scores,
        coalesce(s.predictions_scored, 0) as predictions_scored
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    join public.profiles pr on pr.id = lm.user_id
    left join public.standings s
        on s.user_id = lm.user_id and s.competition_id = l.competition_id
    where lm.league_id = p_league_id
    order by rank, lower(pr.username)
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.get_global_leaderboard (uuid, int, int) from public, anon;
revoke execute on function public.get_league_leaderboard (uuid, int, int) from public, anon;
grant execute on function public.get_global_leaderboard (uuid, int, int) to authenticated;
grant execute on function public.get_league_leaderboard (uuid, int, int) to authenticated;
