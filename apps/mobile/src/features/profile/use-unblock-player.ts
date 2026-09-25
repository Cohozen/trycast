import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Débloque un joueur ; la RLS limite la suppression à mes propres blocages. */
export function useUnblockPlayer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (blockedId: string) => {
            const { error } = await supabase
                .from('user_blocks')
                .delete()
                .eq('blocked_id', blockedId);
            if (error) throw error;
        },
        // Tout le cache, comme useBlockPlayer
        onSuccess: () => queryClient.invalidateQueries(),
    });
}
