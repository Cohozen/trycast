import { queryOptions, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Mes blocages, avec le vrai pseudo des joueurs bloqués : la liste des
 * Réglages est le seul endroit qui l'affiche, pour savoir qui débloquer.
 * La RLS de `user_blocks` ne rend que les lignes dont je suis le bloqueur.
 * Même requête que `useBlockedIds` (même clé, un seul appel réseau).
 */
export const blockedPlayersQuery = queryOptions({
    queryKey: ['blocks'],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('user_blocks')
            .select('blocked_id, created_at, blocked:profiles!blocked_id(username)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
});

export function useBlockedPlayers() {
    return useQuery(blockedPlayersQuery);
}
