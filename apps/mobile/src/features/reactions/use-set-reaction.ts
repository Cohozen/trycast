import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { MemberPrediction } from '@/features/predictions/types';
import {
    applyReaction,
    isReactionKey,
    parseReactionCounts,
    type ReactionKey,
} from '@/features/reactions/reactions';
import { trackEvent } from '@/lib/analytics';
import { hapticLight } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

type SetReactionInput = {
    targetUserId: string;
    /** Réaction voulue ; null = retirer la mienne. */
    next: ReactionKey | null;
};

/**
 * Pose, remplace ou retire ma réaction au prono d'un membre, dans une ligue.
 * Toutes les règles (appartenance, kickoff passé, cible avec prono, pas soi-
 * même) sont dans les RPC set_/clear_prediction_reaction : le client n'est
 * qu'une UX. « Retaper la même retire » se décide à l'appel (`next` à null).
 *
 * Optimiste : la puce doit suivre le doigt, pas le réseau. Le cache modifié
 * est celui de la liste des pronos de la ligue (useMatchLeaguePredictions),
 * qui porte compteurs et `my_reaction` ; retour à l'état précédent en cas de
 * refus, puis rechargement pour recaler les compteurs des autres.
 */
export function useSetReaction(leagueId: string | undefined, matchId: string | undefined) {
    const queryClient = useQueryClient();
    const queryKey = ['predictions', 'league', leagueId, matchId];

    return useMutation({
        mutationFn: async ({ targetUserId, next }: SetReactionInput) => {
            const target = {
                p_league_id: leagueId as string,
                p_match_id: matchId as string,
                p_target_user_id: targetUserId,
            };
            const { error } = next
                ? await supabase.rpc('set_prediction_reaction', { ...target, p_reaction: next })
                : await supabase.rpc('clear_prediction_reaction', target);
            if (error) throw error;
        },
        onMutate: async ({ targetUserId, next }) => {
            hapticLight();
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<MemberPrediction[]>(queryKey);
            const entry = previous?.find((row) => row.user_id === targetUserId);
            const before = isReactionKey(entry?.my_reaction) ? entry.my_reaction : null;
            queryClient.setQueryData<MemberPrediction[]>(queryKey, (rows) =>
                rows?.map((row) =>
                    row.user_id === targetUserId
                        ? {
                              ...row,
                              reactions: applyReaction(
                                  parseReactionCounts(row.reactions),
                                  before,
                                  next,
                              ),
                              my_reaction: next,
                          }
                        : row,
                ),
            );
            return { previous, before };
        },
        onError: (_error, _input, context) => {
            queryClient.setQueryData(queryKey, context?.previous);
        },
        onSuccess: (_data, { next }, context) => {
            const reaction = next ?? context?.before;
            if (!reaction) return;
            trackEvent({
                name: 'reaction_changed',
                props: {
                    action: !next ? 'cleared' : context?.before ? 'changed' : 'set',
                    reaction,
                },
            });
        },
        onSettled: (_data, _error, { targetUserId }) =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey }),
                queryClient.invalidateQueries({
                    queryKey: ['reactions', 'reactors', leagueId, matchId, targetUserId],
                }),
            ]),
    });
}
