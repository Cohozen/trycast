import type { Database } from '@/lib/database.types';

export type LeagueRow = Database['public']['Tables']['leagues']['Row'];

/** Ligne de classement servie par les RPC (général et ligue, même forme). */
export type LeaderboardEntry =
    Database['public']['Functions']['get_global_leaderboard']['Returns'][number];
