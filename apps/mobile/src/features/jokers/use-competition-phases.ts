import { useQuery } from '@tanstack/react-query';

import type { CompetitionPhase } from '@/features/jokers/types';
import { supabase } from '@/lib/supabase';

/**
 * Phases d'une compétition (fenêtres de dates), dans l'ordre. Données de
 * référence, lisibles par tout connecté : une compétition sans phase n'a pas
 * de joker, et les cartes masquent alors le bouton ×2.
 */
export function useCompetitionPhases(competitionId: string | undefined) {
    return useQuery({
        queryKey: ['phases', competitionId],
        enabled: !!competitionId,
        staleTime: 60 * 60 * 1000,
        queryFn: async (): Promise<CompetitionPhase[]> => {
            const { data, error } = await supabase
                .from('competition_phases')
                .select('*')
                .eq('competition_id', competitionId as string)
                .order('sort');
            if (error) throw error;
            return data;
        },
    });
}
