import { useQuery } from '@tanstack/react-query';

import { MATCH_WITH_TEAMS } from '@/features/matches/match-select';
import type { MatchWithTeams } from '@/features/matches/types';
import { supabase } from '@/lib/supabase';

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
