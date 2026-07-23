-- Profil public d'un joueur (2026-07-24) : les pronos d'UN utilisateur sur une
-- compétition. La RLS de predictions (predictions_select_own) ne laisse lire
-- que SES pronos — à raison : avant le kickoff, les scores des autres restent
-- secrets (pas de copie). Cette RPC security definer est, avec
-- get_match_league_predictions, la seule porte vers les lignes des autres, et
-- elle applique la MÊME garde : rien tant que le coup d'envoi n'est pas passé.
-- À ce moment-là la deadline RLS a déjà verrouillé les écritures, donc voir le
-- prono d'un autre ne permet plus de tricher.
--
-- Pas de garde d'appartenance à une ligue ici, contrairement à
-- get_match_league_predictions : le profil public est ouvert à tout connecté,
-- au même titre que profiles (profiles_select_authenticated) et standings
-- (standings_select_authenticated), tous deux en `using (true)`. Le classement
-- général est déjà public : un profil qui en découle l'est aussi.
--
-- `returns setof public.predictions` : le type généré côté client est
-- exactement PredictionRow, donc l'onglet Pronos et le calcul de stats du
-- Profil réutilisent tels quels computeProfileStats / computePointsByRound /
-- ResultCard, sans type parallèle à maintenir.

create or replace function public.get_user_predictions(
    p_user_id uuid,
    p_competition_id uuid
) returns setof public.predictions
language sql
stable
security definer
set search_path = ''
as $$
    select p.*
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.user_id = p_user_id
        and m.competition_id = p_competition_id
        and now() >= m.kickoff_at;
$$;

-- Les fonctions naissent exécutables par public : réservée aux connectés.
revoke execute on function public.get_user_predictions (uuid, uuid) from public, anon;
grant execute on function public.get_user_predictions (uuid, uuid) to authenticated;
