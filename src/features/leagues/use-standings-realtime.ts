import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Abonnement Realtime aux standings de la compétition : dès qu'un scoring
 * passe, toutes les queries leaderboard (général et ligues) sont invalidées.
 * À monter UNE seule fois (layout du groupe app) — un channel par compétition.
 * Un événement raté (app en arrière-plan) est rattrapé par le staleTime et le
 * refetch au focus de TanStack Query.
 */
export function useStandingsRealtime(competitionId: string | undefined) {
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!competitionId) return;
        const channel = supabase
            .channel(`standings-${competitionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'standings',
                    filter: `competition_id=eq.${competitionId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
                },
            )
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [competitionId, queryClient]);
}
