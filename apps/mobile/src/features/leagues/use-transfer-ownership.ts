import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Transfère la propriété d'une ligue à un membre (RPC security definer :
 * owner_id et les deux rôles basculent atomiquement, le client ne peut pas
 * toucher ces colonnes). L'appelant devient simple membre.
 */
export function useTransferOwnership(leagueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newOwnerId: string) => {
            const { data, error } = await supabase.rpc('transfer_league_ownership', {
                p_league_id: leagueId,
                p_new_owner_id: newOwnerId,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard', 'league', leagueId] });
        },
    });
}
