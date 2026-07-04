-- Lot 2 : durcissement des grants sur les tables du pipeline compétition.
-- Le projet dev applique encore les default privileges legacy (grant all à
-- anon/authenticated sur toute nouvelle table). La sécurité est déjà portée par
-- RLS (aucune policy d'écriture ; job_runs sans policy), ceci est de la défense
-- en profondeur : on aligne les grants sur l'usage réel — lecture authentifiée
-- sur les tables métier, rien pour anon, rien pour les clients sur job_runs.

revoke all on public.competitions, public.teams, public.matches, public.job_runs from anon;
revoke all on public.competitions, public.teams, public.matches from authenticated;
grant select on public.competitions, public.teams, public.matches to authenticated;
revoke all on public.job_runs from authenticated;
