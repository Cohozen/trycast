-- Bloc « Ce qu'a joué la communauté » du détail d'un match en cours ou
-- terminé (DS du 2026-09-24) : parts 1/N/2, score le plus joué, scores
-- exacts trouvés, points moyens.
--
-- La RLS de predictions ne laisse lire que SES pronos. Cette RPC security
-- definer n'expose que des AGRÉGATS : les pronos regroupés par (score
-- pronostiqué, bonus offensifs cochés, joker posé, points attribués), avec
-- leur nombre — jamais une ligne individuelle ni un identifiant.
-- Contrairement à `get_prediction_distributions` (1/N/2 seulement, visible
-- avant le match par décision de Corentin), les scores exacts restent
-- secrets jusqu'au coup d'envoi : la RPC ne rend RIEN avant le kickoff, ni
-- pour un match reporté ou annulé.
--
-- Le calcul vit côté client, avec le module de scoring partagé : en live,
-- les points (provisoires) se recalculent contre le score en direct, comme
-- la carte « Points gagnés » ; une fois le match scoré, `points_awarded`
-- fait foi (il intègre les essais et le joker). Un seul chemin de code sert
-- donc les deux états.
-- Comptes de démonstration exclus, comme dans le classement général.

create or replace function public.get_match_community_histogram(p_match_id uuid)
returns table (
  predicted_home_score int,
  predicted_away_score int,
  bonus_off_home boolean,
  bonus_off_away boolean,
  joker boolean,
  points_awarded int,
  predictions int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.predicted_home_score,
    p.predicted_away_score,
    p.predicted_bonus_off_home,
    p.predicted_bonus_off_away,
    (j.user_id is not null) as joker,
    p.points_awarded,
    count(*)::int
  from public.predictions p
  join public.matches m on m.id = p.match_id
  join public.profiles pr on pr.id = p.user_id
  left join public.phase_jokers j on j.user_id = p.user_id and j.match_id = p.match_id
  where p.match_id = p_match_id
    and m.kickoff_at <= now()
    and m.status not in ('postponed', 'cancelled')
    and not pr.is_demo
  group by 1, 2, 3, 4, 5, 6;
$$;

-- Les fonctions naissent exécutables par public : réservée aux connectés.
revoke execute on function public.get_match_community_histogram (uuid) from public, anon;
grant execute on function public.get_match_community_histogram (uuid) to authenticated;
