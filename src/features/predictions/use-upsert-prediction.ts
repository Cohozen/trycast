import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PredictionDraft } from '@/features/predictions/types';
import { supabase } from '@/lib/supabase';

/**
 * Crée ou met à jour mon prono sur un match (unique par user × match).
 * La deadline au kickoff est portée par la RLS : après le coup d'envoi,
 * Postgres refuse l'écriture (42501) quelle que soit l'UI.
 */
export function useUpsertPrediction(userId: string, competitionId: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (draft: PredictionDraft) => {
            const { data, error } = await supabase
                .from('predictions')
                .upsert({ user_id: userId, ...draft }, { onConflict: 'user_id,match_id' })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['predictions', competitionId] });
        },
    });
}
