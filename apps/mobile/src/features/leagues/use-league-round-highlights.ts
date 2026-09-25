import { useQuery } from '@tanstack/react-query';

import { useMaskBlocked } from '@/features/profile/use-mask-blocked';
import { supabase } from '@/lib/supabase';

/**
 * Coups de la journée d'une ligue (RPC get_league_round_highlights) : un
 * lauréat par ligne, seulement pour les journées complètes qui en ont un. Un
 * non-membre reçoit 0 ligne. Mise en scène côté client (buildRoundHighlights).
 */
export function useLeagueRoundHighlights(leagueId: string | undefined) {
    const mask = useMaskBlocked();
    return useQuery({
        queryKey: ['leagues', leagueId, 'roundHighlights'],
        enabled: !!leagueId,
        select: mask,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_league_round_highlights', {
                p_league_id: leagueId as string,
            });
            if (error) throw error;
            return data;
        },
    });
}
