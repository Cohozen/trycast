-- Carte « Tes points » de l'accueil (DS du 2026-09-23) : places gagnées ou
-- perdues au général sur la journée en cours.
--
-- standings ne garde que l'état courant : le rang d'avant la journée se
-- RECALCULE depuis les pronos scorés dont le match a commencé avant
-- p_before (le premier coup d'envoi de la journée, fourni par le client qui
-- regroupe déjà les journées : round brut ou étape à élimination directe).
--
-- Agrégat et départage IDENTIQUES à standings (apply_match_scores,
-- 20260708000200 : total, puis scores exacts, puis MOINS de pronos scorés) et
-- au rank() de get_global_leaderboard (comptes de démo exclus, 20260903000100).
-- Toute évolution de l'un de ces critères doit toucher cette fonction aussi,
-- sinon le delta affiché mentirait.
--
-- security definer : le calcul lit les pronos de tous les joueurs, que la RLS
-- de predictions cache au client. Seul le rang de l'appelant sort — le
-- classement général est déjà public (standings), rien de plus n'est exposé.
-- null : aucun prono scoré avant p_before (première journée, nouveau joueur),
-- ou compte de démo (absent du général).

create function public.get_my_previous_rank(
    p_competition_id uuid,
    p_before timestamptz
) returns int
language sql
stable
security definer
set search_path = ''
as $$
    with totals as (
        select
            p.user_id,
            coalesce(sum(p.points_awarded), 0) as total_points,
            count(*) filter (
                where p.predicted_home_score = m.home_score
                    and p.predicted_away_score = m.away_score
            ) as exact_scores,
            count(*) as predictions_scored
        from public.predictions p
        join public.matches m on m.id = p.match_id
        join public.profiles pr on pr.id = p.user_id
        where m.competition_id = p_competition_id
          and m.kickoff_at < p_before
          and p.scored_at is not null
          and not pr.is_demo
        group by p.user_id
    ),
    ranked as (
        select
            user_id,
            rank() over (
                order by total_points desc, exact_scores desc, predictions_scored asc
            ) as rank
        from totals
    )
    select rank::int from ranked where user_id = (select auth.uid());
$$;

revoke execute on function public.get_my_previous_rank (uuid, timestamptz) from public, anon;
grant execute on function public.get_my_previous_rank (uuid, timestamptz) to authenticated;
