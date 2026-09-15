import type { PostgrestError } from '@supabase/supabase-js';

/** Clé i18n d'une erreur d'upsert de prono, à passer à t() côté écran. */
export type PredictionMessageKey =
    | 'predictions:errors.deadline'
    | 'predictions:errors.invalidScore'
    | 'predictions:errors.saveFailed';

/**
 * Traduit les erreurs Postgres de l'upsert de prono en clé i18n. Le cas
 * nominal est le 42501 : la RLS a refusé l'écriture parce que le coup
 * d'envoi est passé (deadline serveur, quelle que soit l'UI).
 */
export function toPredictionMessageKey(error: PostgrestError): PredictionMessageKey {
    switch (error.code) {
        case '42501':
            return 'predictions:errors.deadline';
        case '23514':
            return 'predictions:errors.invalidScore';
        default:
            return 'predictions:errors.saveFailed';
    }
}
