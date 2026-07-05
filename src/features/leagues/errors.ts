import { PostgrestError } from '@supabase/supabase-js';

/**
 * Traduit les erreurs Postgres des actions de ligue. Le P0002 vient des RPC
 * (code d'invitation inconnu, aucune compétition active) ; le 23514 du check
 * sur le nom ; le 42501 d'une écriture refusée par la RLS ou les grants.
 */
export function toFrenchLeagueMessage(error: unknown): string {
    const code = error instanceof PostgrestError ? error.code : undefined;
    switch (code) {
        case 'P0002':
            return 'Code d’invitation invalide.';
        case '23514':
            return 'Nom de ligue invalide (3 à 40 caractères).';
        case '42501':
            return 'Action non autorisée.';
        default:
            return 'Impossible de contacter le serveur. Réessaie dans un instant.';
    }
}
