import { useQuery } from '@tanstack/react-query';

import type { JokersByPhase } from '@/features/jokers/types';
import { supabase } from '@/lib/supabase';

/**
 * Mes jokers d'une compétition, indexés par phase, avec le coup d'envoi du
 * match doublé (un joker sur un match commencé est consommé). La RLS ne
 * renvoie que mes lignes.
 */
export function useMyJokers(competitionId: string | undefined) {
    return useQuery({
        queryKey: ['jokers', competitionId],
        enabled: !!competitionId,
        queryFn: async (): Promise<JokersByPhase> => {
            const { data, error } = await supabase
                .from('phase_jokers')
                .select('phase_id, match_id, match:matches!inner(kickoff_at, competition_id)')
                .eq('match.competition_id', competitionId as string);
            if (error) throw error;
            return new Map(
                data.map((row) => [
                    row.phase_id,
                    {
                        phaseId: row.phase_id,
                        matchId: row.match_id,
                        kickoffAt: row.match.kickoff_at,
                    },
                ]),
            );
        },
    });
}
