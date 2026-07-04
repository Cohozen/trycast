import { useQuery } from '@tanstack/react-query';

import type { MatchWithTeams } from '@/features/matches/types';
import { supabase } from '@/lib/supabase';

// Deux FK matches → teams : les hints !matches_home_team_id_fkey /
// !matches_away_team_id_fkey sont obligatoires, sinon PostgREST renvoie
// une erreur d'ambiguïté sur l'embed.
const MATCH_WITH_TEAMS = `*,
    home_team:teams!matches_home_team_id_fkey(*),
    away_team:teams!matches_away_team_id_fkey(*)`;

/** Matchs d'une compétition, triés par coup d'envoi, équipes embarquées. */
export function useMatches(competitionId: string | undefined) {
    return useQuery({
        queryKey: ['matches', competitionId],
        enabled: !!competitionId,
        queryFn: async (): Promise<MatchWithTeams[]> => {
            const { data, error } = await supabase
                .from('matches')
                .select(MATCH_WITH_TEAMS)
                .eq('competition_id', competitionId as string)
                .order('kickoff_at');
            if (error) throw error;
            return data;
        },
    });
}
