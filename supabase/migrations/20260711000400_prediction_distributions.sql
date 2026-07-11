-- Distribution communautaire des pronos 1/N/2 par match (blocs maquettés,
-- 2026-07-11). La RLS de predictions ne laisse lire que SES pronos — à
-- raison : les scores exacts des autres restent secrets. Cette RPC
-- security definer n'expose que des AGRÉGATS (comptes 1/N/2 par match),
-- jamais une ligne individuelle.
-- Décision Corentin (2026-07-11) : la distribution est visible pendant
-- toute la période de pronos, y compris AVANT kickoff — assumé pour donner
-- du peps au jeu, même si ça peut influencer les joueurs (et laisser
-- deviner un prono dans une toute petite communauté). C'est pourquoi il
-- n'y a volontairement pas de filtre kickoff ici.
-- Batch par compétition : calque les query keys du client (une requête par
-- écran, pas une par match).

create or replace function public.get_prediction_distributions(p_competition_id uuid)
returns table (
  match_id uuid,
  home_count int,
  draw_count int,
  away_count int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.match_id,
    (count(*) filter (where p.predicted_home_score > p.predicted_away_score))::int,
    (count(*) filter (where p.predicted_home_score = p.predicted_away_score))::int,
    (count(*) filter (where p.predicted_home_score < p.predicted_away_score))::int
  from public.predictions p
  join public.matches m on m.id = p.match_id
  where m.competition_id = p_competition_id
  group by p.match_id;
$$;

-- Les fonctions naissent exécutables par public : réservée aux connectés.
revoke execute on function public.get_prediction_distributions (uuid) from public, anon;
grant execute on function public.get_prediction_distributions (uuid) to authenticated;
