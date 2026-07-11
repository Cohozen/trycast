import { useQuery } from '@tanstack/react-query';

import type { DistributionsByMatch } from '@/features/predictions/types';
import { supabase } from '@/lib/supabase';

/**
 * Distribution communautaire 1/N/2 des matchs d'une compétition, indexée par
 * match. Passe par la RPC security definer `get_prediction_distributions` :
 * la RLS interdit de lire les pronos des autres, seule la RPC sert des
 * agrégats. Chargée une fois au montage de l'écran (décision Corentin) :
 * pas de refetch tant qu'on reste sur la page.
 */
export function useCommunityDistributions(competitionId: string | undefined) {
    return useQuery({
        queryKey: ['prediction-distributions', competitionId],
        enabled: !!competitionId,
        staleTime: Number.POSITIVE_INFINITY,
        queryFn: async (): Promise<DistributionsByMatch> => {
            const { data, error } = await supabase.rpc('get_prediction_distributions', {
                p_competition_id: competitionId as string,
            });
            if (error) throw error;
            return new Map(
                data.map((row) => [
                    row.match_id,
                    {
                        home: row.home_count,
                        draw: row.draw_count,
                        away: row.away_count,
                        total: row.home_count + row.draw_count + row.away_count,
                    },
                ]),
            );
        },
    });
}
