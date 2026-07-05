import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Classement général de la compétition (rank + tie-breakers côté serveur). */
export function useGlobalLeaderboard(competitionId: string | undefined, limit = 50) {
    return useQuery({
        queryKey: ['leaderboard', 'global', competitionId],
        enabled: !!competitionId,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_global_leaderboard', {
                p_competition_id: competitionId as string,
                p_limit: limit,
            });
            if (error) throw error;
            return data;
        },
    });
}
