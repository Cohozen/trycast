import { useQuery } from '@tanstack/react-query';

import type { PredictionsByMatch } from '@/features/predictions/types';
import { supabase } from '@/lib/supabase';

/**
 * Mes pronos des matchs d'une compétition, indexés par match. La RLS ne
 * renvoie que les pronos de l'utilisateur connecté : pas de filtre user côté
 * client.
 */
export function useMyPredictions(competitionId: string | undefined) {
    return useQuery({
        queryKey: ['predictions', competitionId],
        enabled: !!competitionId,
        queryFn: async (): Promise<PredictionsByMatch> => {
            const { data, error } = await supabase
                .from('predictions')
                .select('*, match:matches!inner(competition_id)')
                .eq('match.competition_id', competitionId as string);
            if (error) throw error;
            return new Map(data.map(({ match: _match, ...row }) => [row.match_id, row]));
        },
    });
}
