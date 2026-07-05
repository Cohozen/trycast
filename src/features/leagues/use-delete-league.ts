import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Supprime une ligue (owner uniquement via la RLS, cascade des membres). */
export function useDeleteLeague() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (leagueId: string) => {
            const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}
