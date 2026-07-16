import type { Database } from '@/lib/database.types';

export type LeagueRow = Database['public']['Tables']['leagues']['Row'];

/** Ligne de classement servie par les RPC (général et ligue, même forme). */
export type LeaderboardEntry =
    Database['public']['Functions']['get_global_leaderboard']['Returns'][number];

/** Aperçu d'une ligue résolue par code, avant adhésion (sheet Rejoindre). */
export type LeaguePreview = Database['public']['Functions']['preview_league']['Returns'][number];

/** Points d'un membre sur une journée (onglet Résultats du détail de ligue). */
export type LeagueRoundPointsRow =
    Database['public']['Functions']['get_league_round_points']['Returns'][number];
