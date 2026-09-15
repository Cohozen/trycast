// Deux FK matches → teams : les hints !matches_home_team_id_fkey /
// !matches_away_team_id_fkey sont obligatoires, sinon PostgREST renvoie
// une erreur d'ambiguïté sur l'embed. Fragment partagé par tous les hooks
// qui chargent des matchs avec leurs équipes.
export const MATCH_WITH_TEAMS = `*,
    home_team:teams!matches_home_team_id_fkey(*),
    away_team:teams!matches_away_team_id_fkey(*)`;
