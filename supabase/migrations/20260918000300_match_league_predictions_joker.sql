-- Joker par phase : la liste des pronos de la ligue sur un match montre aussi
-- qui a posé son ×2 dessus. Même garde que le prono (20260713000100) : rien
-- avant le coup d'envoi — à ce moment-là set_phase_joker refuse déjà de
-- toucher ce match, donc le révéler ne permet plus d'en tirer parti.
--
-- La signature de retour change (colonne is_joker) : `create or replace` ne
-- le permet pas, d'où drop + create et les grants rejoués.

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
    is_joker boolean
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
        ) as is_joker
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
