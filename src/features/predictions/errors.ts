import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Traduit les erreurs Postgres de l'upsert de prono. Le cas nominal est le
 * 42501 : la RLS a refusé l'écriture parce que le coup d'envoi est passé
 * (deadline serveur, quelle que soit l'UI).
 */
export function toFrenchPredictionMessage(error: PostgrestError): string {
    switch (error.code) {
        case '42501':
            return 'Trop tard : le coup d’envoi est passé, le prono est verrouillé.';
        case '23514':
            return 'Score invalide : entre un nombre entier positif.';
        default:
            return 'Impossible d’enregistrer ton prono. Réessaie dans un instant.';
    }
}
