// Miroir des contraintes SQL de leagues (nom 3-40, code 8 chars sans 0/O/1/I/L)

/** Clé i18n d'une erreur de validation de ligue, à passer à t() côté écran. */
export type LeagueValidationKey =
    | 'leagues:validation.nameRequired'
    | 'leagues:validation.nameLength';

export function validateLeagueName(raw: string): LeagueValidationKey | null {
    const name = raw.trim();
    if (name === '') {
        return 'leagues:validation.nameRequired';
    }
    if (name.length < 3 || name.length > 40) {
        return 'leagues:validation.nameLength';
    }
    return null;
}

/**
 * Normalise un code d'invitation saisi (espaces, tirets, minuscules tolérés) ;
 * null si la forme ne peut pas être un code valide. La résolution réelle reste
 * côté serveur (join_league).
 */
export function normalizeInviteCode(raw: string): string | null {
    const code = raw.toUpperCase().replaceAll(/[\s-]/g, '');
    return /^[A-HJ-KM-NP-Z2-9]{8}$/.test(code) ? code : null;
}
