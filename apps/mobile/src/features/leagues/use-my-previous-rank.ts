import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Mon rang au général avant `before` (premier coup d'envoi de la journée en
 * cours), recalculé par la RPC get_my_previous_rank : sert au delta « +N
 * places » de la carte « Tes points ». null = pas de prono scoré avant (ou
 * compte de démo). Clé sous ['leaderboard'] : invalidée par le Realtime des
 * standings comme le classement.
 */
export function useMyPreviousRank(competitionId: string | undefined, before: string | undefined) {
    return useQuery({
        queryKey: ['leaderboard', 'previousRank', competitionId, before],
        enabled: !!competitionId && !!before,
        queryFn: async (): Promise<number | null> => {
            const { data, error } = await supabase.rpc('get_my_previous_rank', {
                p_competition_id: competitionId as string,
                p_before: before as string,
            });
            if (error) throw error;
            return data ?? null;
        },
    });
}
