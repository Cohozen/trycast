import { useQuery } from '@tanstack/react-query';

import type { PredictionsByMatch } from '@/features/predictions/types';
import { supabase } from '@/lib/supabase';

/**
 * Les pronos d'un joueur (moi ou un autre) sur une compétition, indexés par
 * match. Passe par la RPC get_user_predictions : la RLS de predictions ne
 * laisse lire que ses propres lignes, et la RPC n'expose que les matchs dont
 * le coup d'envoi est passé (garantie serveur anti-copie).
 *
 * Le profil n'affiche que des matchs terminés : cette restriction ne se voit
 * pas à l'écran, y compris sur son propre profil.
 */
export function useUserPredictions(userId: string | undefined, competitionId: string | undefined) {
    return useQuery({
        queryKey: ['user-predictions', userId, competitionId],
        enabled: !!userId && !!competitionId,
        queryFn: async (): Promise<PredictionsByMatch> => {
            const { data, error } = await supabase.rpc('get_user_predictions', {
                p_user_id: userId as string,
                p_competition_id: competitionId as string,
            });
            if (error) throw error;
            return new Map(data.map((row) => [row.match_id, row]));
        },
    });
}
