import type { Database } from '@/lib/database.types';

export type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
export type TeamRow = Database['public']['Tables']['teams']['Row'];
export type MatchRow = Database['public']['Tables']['matches']['Row'];
export type MatchStatus = Database['public']['Enums']['match_status'];

/** Match avec ses équipes embarquées (null = équipe à déterminer, ex. avant tirage RWC). */
export type MatchWithTeams = MatchRow & {
    home_team: TeamRow | null;
    away_team: TeamRow | null;
};
