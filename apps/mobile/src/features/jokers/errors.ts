/** Clé i18n d'une erreur de pose / retrait du joker, à passer à t() côté écran. */
export type JokerMessageKey =
    | 'jokers:errors.matchStarted'
    | 'jokers:errors.locked'
    | 'jokers:errors.noPrediction'
    | 'jokers:errors.noPhase'
    | 'jokers:errors.failed';

/**
 * Traduit les erreurs des RPC set_phase_joker / clear_phase_joker. Un même
 * errcode couvre plusieurs cas (42501 : match commencé OU joker consommé ;
 * P0002 : pas de phase OU pas de prono), que la migration distingue par un
 * message-identifiant stable — lu ici.
 *
 * Lecture duck-typée (cf. leagues/errors.ts) : `instanceof PostgrestError`
 * échoue sous Hermes.
 */
export function toJokerMessageKey(error: unknown): JokerMessageKey {
    if (typeof error !== 'object' || error === null) return 'jokers:errors.failed';
    const { code, message } = error as { code?: unknown; message?: unknown };
    switch (message) {
        case 'match_started':
            return 'jokers:errors.matchStarted';
        case 'joker_locked':
            return 'jokers:errors.locked';
        case 'no_prediction':
            return 'jokers:errors.noPrediction';
        case 'no_phase':
            return 'jokers:errors.noPhase';
    }
    return code === '42501' ? 'jokers:errors.matchStarted' : 'jokers:errors.failed';
}
