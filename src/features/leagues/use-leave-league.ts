import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Quitte une ligue (supprime ma membership). La RLS interdit ce chemin à
 * l'owner : lui supprime sa ligue.
 */
export function useLeaveLeague(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (leagueId: string) => {
            const { error } = await supabase
                .from('league_members')
                .delete()
                .eq('league_id', leagueId)
                .eq('user_id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}
