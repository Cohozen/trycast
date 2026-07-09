import { useQuery } from '@tanstack/react-query';

import { betterThanFilter, type StandingScore } from '@/features/leagues/ranking';
import { supabase } from '@/lib/supabase';

export type MyRank = {
    /** Rang au général (null tant qu'aucun prono scoré). */
    rank: number | null;
    /** Nombre total de joueurs classés sur la compétition. */
    total: number;
    /** Écart de points avec le joueur juste au-dessus (null si premier). */
    gapToAbove: number | null;
};

/**
 * Mon rang au classement général sans charger le leaderboard : deux requêtes
 * head+count sur standings (RLS select-authenticated sur toutes les lignes),
 * avec les tie-breakers exacts de la RPC. `standing` = ma ligne (undefined
 * tant qu'elle charge, null si pas encore scoré).
 */
export function useMyRank(
    competitionId: string | undefined,
    standing: StandingScore | null | undefined,
) {
    return useQuery({
        queryKey: [
            'standings',
            'rank',
            competitionId,
            standing?.total_points,
            standing?.exact_scores,
            standing?.predictions_scored,
        ],
        enabled: !!competitionId && standing !== undefined,
        queryFn: async (): Promise<MyRank> => {
            const total = await supabase
                .from('standings')
                .select('*', { count: 'exact', head: true })
                .eq('competition_id', competitionId as string);
            if (total.error) throw total.error;

            if (!standing) return { rank: null, total: total.count ?? 0, gapToAbove: null };

            const better = await supabase
                .from('standings')
                .select('*', { count: 'exact', head: true })
                .eq('competition_id', competitionId as string)
                .or(betterThanFilter(standing));
            if (better.error) throw better.error;

            // Le joueur juste au-dessus = le moins bon des meilleurs
            const above = await supabase
                .from('standings')
                .select('total_points')
                .eq('competition_id', competitionId as string)
                .or(betterThanFilter(standing))
                .order('total_points', { ascending: true })
                .order('exact_scores', { ascending: true })
                .order('predictions_scored', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (above.error) throw above.error;

            return {
                rank: (better.count ?? 0) + 1,
                total: total.count ?? 0,
                gapToAbove: above.data ? above.data.total_points - standing.total_points : null,
            };
        },
    });
}
