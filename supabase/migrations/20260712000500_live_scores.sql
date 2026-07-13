-- Score en direct (carte LIVE de l'accueil Matchs). Colonnes DISTINCTES du
-- résultat final : home_score/away_score sont les déclencheurs du pipeline de
-- scoring (apply_match_scores) et ne doivent JAMAIS porter un score in-play.
-- L'EF sync-live (cron dédié) écrit ces colonnes pendant le match ; le client
-- affiche la carte tant que live_updated_at est récent et le match non terminé.
--
-- live_period : libellé d'état Highlightly (state.description, ex. « First
-- Half », « Half Time », « Second Half ») — la minute exacte n'est pas exposée
-- de façon fiable, on retombe sur la période. Écriture service_role only (comme
-- les autres colonnes de matches : aucune policy write) ; la lecture est déjà
-- couverte par le grant select table de 20260705000400.

alter table public.matches
  add column live_home_score int,
  add column live_away_score int,
  add column live_period text,
  add column live_updated_at timestamptz;
