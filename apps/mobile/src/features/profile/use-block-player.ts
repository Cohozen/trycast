import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

/**
 * Bloque un joueur : il devient « Joueur masqué » partout pour moi, et ses
 * réactions disparaissent (filtrées par le serveur). Il n'en sait rien.
 */
export function useBlockPlayer() {
    const queryClient = useQueryClient();
    const { session } = useSession();
    return useMutation({
        mutationFn: async (blockedId: string) => {
            const { error } = await supabase
                .from('user_blocks')
                .insert({ blocker_id: session?.user.id as string, blocked_id: blockedId });
            // Déjà bloqué (double tap, autre appareil) : l'état voulu est atteint
            if (error && error.code !== '23505') throw error;
        },
        // ponytail: tout le cache, parce que le blocage touche classements,
        // pronos et réactions ; l'action est rare. À cibler si le rechargement se voit.
        onSuccess: () => queryClient.invalidateQueries(),
    });
}
