import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { JokersByPhase } from '@/features/jokers/types';
import { trackEvent } from '@/lib/analytics';
import { hapticLight } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

type ToggleJokerInput = {
    phaseId: string;
    matchId: string;
    kickoffAt: string;
    /** true = poser (ou déplacer) le joker sur ce match ; false = le retirer. */
    on: boolean;
};

/**
 * Pose, déplace ou retire le joker d'une phase. Toutes les règles (deadline
 * au kickoff, joker consommé, prono requis) sont dans les RPC
 * set_phase_joker / clear_phase_joker : le client n'est qu'une UX.
 *
 * Optimiste : la bordure verte de la carte doit suivre le doigt, pas le
 * réseau. En cas de refus, retour à l'état précédent et erreur exposée.
 */
export function useToggleJoker(competitionId: string | undefined) {
    const queryClient = useQueryClient();
    const queryKey = ['jokers', competitionId];

    return useMutation({
        mutationFn: async ({ phaseId, matchId, on }: ToggleJokerInput) => {
            const { error } = on
                ? await supabase.rpc('set_phase_joker', { p_match_id: matchId })
                : await supabase.rpc('clear_phase_joker', { p_phase_id: phaseId });
            if (error) throw error;
        },
        onMutate: async ({ phaseId, matchId, kickoffAt, on }) => {
            hapticLight();
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<JokersByPhase>(queryKey);
            const next: JokersByPhase = new Map(previous);
            if (on) {
                next.set(phaseId, { phaseId, matchId, kickoffAt });
            } else {
                next.delete(phaseId);
            }
            queryClient.setQueryData(queryKey, next);
            return { previous };
        },
        onError: (_error, _input, context) => {
            queryClient.setQueryData(queryKey, context?.previous);
        },
        onSuccess: (_data, { phaseId, on }, context) => {
            trackEvent({
                name: 'joker_changed',
                props: {
                    action: !on ? 'cleared' : context?.previous?.has(phaseId) ? 'moved' : 'set',
                },
            });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey }),
    });
}
