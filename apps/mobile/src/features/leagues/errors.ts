/** Clé i18n d'une erreur d'action de ligue, à passer à t() côté écran. */
export type LeagueMessageKey =
    | 'leagues:errors.invalidCode'
    | 'leagues:errors.invalidName'
    | 'leagues:errors.full'
    | 'leagues:errors.notAllowed'
    | 'leagues:errors.server';

/**
 * Traduit les erreurs Postgres des actions de ligue en clé i18n. Le P0002
 * vient des RPC (code d'invitation inconnu, aucune compétition active) ; le
 * 23514 du check sur le nom ou la couleur ; le P0003 du plafond de 50 membres
 * (join_league) ; le 42501 d'une écriture refusée par la RLS ou les grants.
 *
 * Lecture duck-typée du `code` : `instanceof PostgrestError` échoue sous
 * Hermes quand le bundle embarque une seconde copie de postgrest-js (vécu
 * 2026-07-16 sur le simulateur — P0002 retombait dans le message serveur).
 */
export function toLeagueMessageKey(error: unknown): LeagueMessageKey {
    const code =
        typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code: unknown }).code)
            : undefined;
    switch (code) {
        case 'P0002':
            return 'leagues:errors.invalidCode';
        case 'P0003':
            return 'leagues:errors.full';
        case '23514':
            return 'leagues:errors.invalidName';
        case '42501':
            return 'leagues:errors.notAllowed';
        default:
            return 'leagues:errors.server';
    }
}
