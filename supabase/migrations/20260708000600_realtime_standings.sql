-- Lot 5 : première table Realtime du projet — l'app s'abonne aux changements
-- de standings (postgres_changes filtré par competition_id) pour rafraîchir
-- les classements dès qu'un scoring passe. La publication supabase_realtime
-- existe par défaut (vide) sur les projets Supabase — vérifié sur trycast-dev.
-- postgres_changes vérifie la RLS par utilisateur (WALRUS) : standings est
-- select-authenticated → tous les connectés reçoivent les événements.
-- replica identity par défaut (PK) suffisante : l'app n'exploite que
-- l'événement (invalidation de query), pas l'old record.
-- NB : alter publication … add table n'est pas idempotent — migration one-shot.

alter publication supabase_realtime add table public.standings;
