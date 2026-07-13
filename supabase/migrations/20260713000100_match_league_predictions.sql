-- Page de détail de match (2026-07-13) : les pronos des membres d'une ligue
-- pour UN match. La RLS de predictions ne laisse lire que SES pronos — à
-- raison : avant le kickoff, les scores des autres restent secrets (pas de
-- copie). Cette RPC security definer est la SEULE porte vers les lignes des
-- autres, et elle ne renvoie RIEN tant que le coup d'envoi n'est pas passé :
-- à ce moment-là la deadline RLS a déjà verrouillé les écritures, donc voir
-- les pronos des autres ne permet plus de tricher.
-- Décisions Corentin (2026-07-13) :
--  - membres sans prono inclus (left join, colonnes null) : la liste colle à
--    l'effectif de la ligue, ligne « — » côté client ;
--  - jamais de prono visible avant kickoff, même masqué — le client n'appelle
--    la RPC qu'après le coup d'envoi, le filtre serveur reste la garantie.
-- Non-membre (ou match d'une autre compétition que la ligue) → 0 ligne, pas
-- d'erreur : même anti-énumération silencieuse que get_league_leaderboard.
-- is_league_member est le helper security definer du lot leagues (casse la
-- récursion RLS) — indispensable ici aussi : definer court-circuite la RLS,
-- la garde d'appartenance doit être explicite.

create or replace function public.get_match_league_predictions(
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
    points_awarded int
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
        p.points_awarded
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

-- Les fonctions naissent exécutables par public : réservée aux connectés.
revoke execute on function public.get_match_league_predictions (uuid, uuid) from public, anon;
grant execute on function public.get_match_league_predictions (uuid, uuid) to authenticated;
