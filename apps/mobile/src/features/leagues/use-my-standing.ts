import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Ma ligne de standings sur la compétition (mini-dashboard de l'accueil).
 * null tant qu'aucun prono n'a été scoré (la ligne n'existe pas encore).
 */
export function useMyStanding(competitionId: string | undefined, userId: string | undefined) {
    return useQuery({
        queryKey: ['standings', 'me', competitionId, userId],
        enabled: !!competitionId && !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('standings')
                .select('*')
                .eq('competition_id', competitionId as string)
                .eq('user_id', userId as string)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
    });
}
