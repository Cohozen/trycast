import { useQuery } from '@tanstack/react-query';

import type { MemberPrediction } from '@/features/predictions/types';
import { supabase } from '@/lib/supabase';

/**
 * Pronos des membres d'une ligue pour un match, via la RPC security definer
 * `get_match_league_predictions` — seule porte vers les lignes des autres,
 * et elle ne renvoie rien avant le kickoff. `kickoffPassed` évite l'appel
 * garanti vide en phase « masquée » ; pas d'invalidation nécessaire (les
 * pronos sont immuables après kickoff, RLS), staleTime court pour laisser
 * arriver les points au scoring.
 */
export function useMatchLeaguePredictions(
    matchId: string | undefined,
    leagueId: string | undefined,
    kickoffPassed: boolean,
) {
    return useQuery({
        queryKey: ['predictions', 'league', leagueId, matchId],
        enabled: !!matchId && !!leagueId && kickoffPassed,
        staleTime: 60_000,
        queryFn: async (): Promise<MemberPrediction[]> => {
            const { data, error } = await supabase.rpc('get_match_league_predictions', {
                p_match_id: matchId as string,
                p_league_id: leagueId as string,
            });
            if (error) throw error;
            return data;
        },
    });
}
