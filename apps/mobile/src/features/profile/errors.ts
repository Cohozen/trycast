/** Clé i18n d'une erreur d'action de profil, à passer à t() côté écran. */
export type ProfileMessageKey =
    | 'profile:username.taken'
    | 'profile:username.notAllowed'
    | 'profile:errors.invalid'
    | 'common:errors.generic';

/**
 * Traduit les erreurs Postgres des actions de profil en clé i18n. Le 23505
 * vient de l'unicité du pseudo, le 23514 d'un check : celui du filtre des
 * pseudos (`profiles_username_clean`, nommé dans le message) ou celui du format
 * (3–20, charset).
 * Lecture duck-typée du `code` : `instanceof PostgrestError` échoue sous
 * Hermes avec une seconde copie de postgrest-js (cf. leagues/errors.ts).
 */
export function toProfileMessageKey(error: unknown): ProfileMessageKey {
    const code =
        typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code: unknown }).code)
            : undefined;
    switch (code) {
        case '23505':
            return 'profile:username.taken';
        case '23514':
            return messageOf(error).includes('profiles_username_clean')
                ? 'profile:username.notAllowed'
                : 'profile:errors.invalid';
        default:
            return 'common:errors.generic';
    }
}

function messageOf(error: unknown): string {
    return typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
}
