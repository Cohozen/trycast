import { useMutation, useQueryClient } from '@tanstack/react-query';

import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

/**
 * Rejoint une ligue par code d'invitation via la RPC join_league (seul moyen
 * de résoudre un code — pas d'énumération par select). Idempotente : re-join
 * renvoie la même ligue sans doublon.
 */
export function useJoinLeague() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (code: string) => {
            const { data, error } = await supabase.rpc('join_league', { p_code: code });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            trackEvent({ name: 'league_joined' });
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}
