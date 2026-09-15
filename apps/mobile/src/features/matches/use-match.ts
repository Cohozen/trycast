import { useQuery } from '@tanstack/react-query';

import { MATCH_WITH_TEAMS } from '@/features/matches/match-select';
import type { MatchDetail } from '@/features/matches/types';
import { supabase } from '@/lib/supabase';

/**
 * Un match par id avec équipes et compétition embarquées, pour la page de
 * détail. Query dédiée (le polling de useLiveMatches alimente un autre
 * cache) : tant que le match est en cours, on refetch à la même cadence de
 * 60 s que la carte LIVE — ça met à jour le score et fait basculer la page
 * en « terminé » toute seule. null = match introuvable.
 */
export function useMatch(matchId: string | undefined) {
    return useQuery({
        queryKey: ['matches', 'detail', matchId],
        enabled: !!matchId,
        refetchInterval: (query) => (query.state.data?.status === 'in_play' ? 60_000 : false),
        queryFn: async (): Promise<MatchDetail | null> => {
            const { data, error } = await supabase
                .from('matches')
                .select(`${MATCH_WITH_TEAMS},
    competition:competitions(*)`)
                .eq('id', matchId as string)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
    });
}
