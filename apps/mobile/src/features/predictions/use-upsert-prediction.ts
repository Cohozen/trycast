import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PredictionDraft } from '@/features/predictions/types';
import { trackEvent } from '@/lib/analytics';
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
        onSuccess: (prediction) => {
            // Le trigger predictions_set_updated_at ne touche updated_at qu'à
            // l'UPDATE : à l'insertion les deux dates sont égales, ce qui
            // distingue un premier prono d'une correction sans que l'appelant
            // ait à le savoir.
            trackEvent({
                name: 'prediction_saved',
                props: { first: prediction.created_at === prediction.updated_at },
            });
            queryClient.invalidateQueries({ queryKey: ['predictions', competitionId] });
        },
    });
}
