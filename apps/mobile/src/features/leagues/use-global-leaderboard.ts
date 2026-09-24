import { useInfiniteQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Taille d'une page : le serveur plafonne `p_limit` à 100. */
export const GLOBAL_LEADERBOARD_PAGE_SIZE = 50;

/**
 * Classement général de la compétition (rank + tie-breakers côté serveur),
 * chargé par pages successives (`p_offset`) au fil du défilement : au 3854ᵉ
 * rang, on ne charge pas la liste jusqu'à soi — la ligne « moi » épinglée
 * s'en charge. `data` est la liste aplatie des pages chargées.
 */
export function useGlobalLeaderboard(competitionId: string | undefined) {
    return useInfiniteQuery({
        queryKey: ['leaderboard', 'global', competitionId],
        enabled: !!competitionId,
        initialPageParam: 0,
        queryFn: async ({ pageParam }) => {
            const { data, error } = await supabase.rpc('get_global_leaderboard', {
                p_competition_id: competitionId as string,
                p_limit: GLOBAL_LEADERBOARD_PAGE_SIZE,
                p_offset: pageParam,
            });
            if (error) throw error;
            return data;
        },
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length === GLOBAL_LEADERBOARD_PAGE_SIZE
                ? allPages.length * GLOBAL_LEADERBOARD_PAGE_SIZE
                : undefined,
        select: (data) => data.pages.flat(),
    });
}
