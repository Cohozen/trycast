import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Classement d'une ligue (membres à 0 point inclus). La RLS renvoie un
 * résultat vide à un non-membre : l'écran le traite comme « ligue introuvable ».
 */
export function useLeagueLeaderboard(leagueId: string | undefined) {
    return useQuery({
        queryKey: ['leaderboard', 'league', leagueId],
        enabled: !!leagueId,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_league_leaderboard', {
                p_league_id: leagueId as string,
            });
            if (error) throw error;
            return data;
        },
    });
}
