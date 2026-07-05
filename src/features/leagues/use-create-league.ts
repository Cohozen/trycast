import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Crée une ligue sur la compétition active via la RPC create_league :
 * code d'invitation généré côté serveur, membership owner incluse (atomique).
 */
export function useCreateLeague() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase.rpc('create_league', { p_name: name });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
        },
    });
}
