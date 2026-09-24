import { useQuery } from '@tanstack/react-query';

import type { CommunityHistogramRow } from '@/features/predictions/types';
import { supabase } from '@/lib/supabase';

/**
 * Histogramme des pronos d'un match commencé (bloc « Ce qu'a joué la
 * communauté »). La RPC security definer ne sert que des agrégats, et rien
 * avant le coup d'envoi : `enabled` suit donc le kickoff.
 */
export function useMatchCommunity(matchId: string, kickoffPassed: boolean) {
    return useQuery({
        queryKey: ['community-histogram', matchId],
        enabled: kickoffPassed,
        queryFn: async (): Promise<CommunityHistogramRow[]> => {
            const { data, error } = await supabase.rpc('get_match_community_histogram', {
                p_match_id: matchId,
            });
            if (error) throw error;
            return data;
        },
    });
}
