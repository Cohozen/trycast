/** Clé i18n d'une erreur de réaction, à passer à t() côté écran. */
export type ReactionMessageKey =
    | 'reactions:errors.notStarted'
    | 'reactions:errors.noPrediction'
    | 'reactions:errors.notMember'
    | 'reactions:errors.failed';

/**
 * Traduit les erreurs de set_prediction_reaction / clear_prediction_reaction.
 * Les messages de la RPC sont des identifiants stables, plus précis que
 * l'errcode (P0002 couvre à la fois not_member et no_prediction).
 * `self_reaction` et `invalid_reaction` ne sont pas atteignables depuis l'UI
 * (pas de bouton sur ma ligne, clés typées) : repli sur l'échec générique.
 *
 * Lecture duck-typée (cf. leagues/errors.ts) : `instanceof PostgrestError`
 * échoue sous Hermes.
 */
export function toReactionMessageKey(error: unknown): ReactionMessageKey {
    if (typeof error !== 'object' || error === null) return 'reactions:errors.failed';
    const { message } = error as { message?: unknown };
    switch (message) {
        case 'not_started':
            return 'reactions:errors.notStarted';
        case 'no_prediction':
            return 'reactions:errors.noPrediction';
        case 'not_member':
            return 'reactions:errors.notMember';
    }
    return 'reactions:errors.failed';
}
