import { useQuery } from '@tanstack/react-query';

import type { CompetitionStage } from '@/features/leagues/types';
import { supabase } from '@/lib/supabase';

/**
 * Étapes à élimination directe d'une compétition (fenêtres de dates), dans
 * l'ordre. Données de référence, lisibles par tout connecté : une compétition
 * sans étape n'a que des journées dans l'onglet Résultats.
 */
export function useCompetitionStages(competitionId: string | undefined) {
    return useQuery({
        queryKey: ['stages', competitionId],
        enabled: !!competitionId,
        staleTime: 60 * 60 * 1000,
        queryFn: async (): Promise<CompetitionStage[]> => {
            const { data, error } = await supabase
                .from('competition_stages')
                .select('*')
                .eq('competition_id', competitionId as string)
                .order('sort');
            if (error) throw error;
            return data;
        },
    });
}
