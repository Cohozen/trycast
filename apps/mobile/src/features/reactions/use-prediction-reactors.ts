import { useQuery } from '@tanstack/react-query';

import type { PredictionReactor } from '@/features/reactions/types';
import { supabase } from '@/lib/supabase';

/**
 * Qui a réagi, et avec quoi, au prono d'un membre (RPC security definer
 * `get_prediction_reactors`). Chargée seulement à l'ouverture de la sheet :
 * la liste des pronos ne porte que les compteurs. Les anciens membres
 * arrivent anonymisés, triés en dernier par le serveur.
 */
export function usePredictionReactors(
    leagueId: string | undefined,
    matchId: string | undefined,
    targetUserId: string | undefined,
) {
    return useQuery({
        queryKey: ['reactions', 'reactors', leagueId, matchId, targetUserId],
        enabled: !!leagueId && !!matchId && !!targetUserId,
        queryFn: async (): Promise<PredictionReactor[]> => {
            const { data, error } = await supabase.rpc('get_prediction_reactors', {
                p_league_id: leagueId as string,
                p_match_id: matchId as string,
                p_target_user_id: targetUserId as string,
            });
            if (error) throw error;
            return data;
        },
    });
}
