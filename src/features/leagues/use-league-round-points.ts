import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Points des membres par journée entamée (RPC get_league_round_points), pour
 * l'onglet Résultats du détail de ligue. Un non-membre reçoit 0 ligne (même
 * anti-énumération silencieuse que le leaderboard). Le regroupement par
 * journée et le rang se calculent côté client (groupRoundPoints).
 */
export function useLeagueRoundPoints(leagueId: string | undefined) {
    return useQuery({
        queryKey: ['leagues', leagueId, 'roundPoints'],
        enabled: !!leagueId,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_league_round_points', {
                p_league_id: leagueId as string,
            });
            if (error) throw error;
            return data;
        },
    });
}
