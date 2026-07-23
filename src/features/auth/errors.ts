import { AuthError, isAuthError } from '@supabase/supabase-js';

const AUTH_ERROR_KEYS = {
    invalid_credentials: 'auth:errors.invalidCredentials',
    user_already_exists: 'auth:errors.emailExists',
    email_exists: 'auth:errors.emailExists',
    email_not_confirmed: 'auth:errors.emailNotConfirmed',
    weak_password: 'auth:errors.weakPassword',
    same_password: 'auth:errors.samePassword',
    over_request_rate_limit: 'auth:errors.rateLimited',
    over_email_send_rate_limit: 'auth:errors.emailRateLimited',
    validation_failed: 'auth:errors.invalidEmail',
    user_not_found: 'auth:errors.userNotFound',
    otp_expired: 'auth:errors.otpExpired',
    session_expired: 'auth:errors.sessionExpired',
} as const;

/**
 * Clé i18n d'un message d'erreur auth, à passer à t() côté écran
 * (écran monté sur useTranslation(['auth', 'common'])).
 */
export type AuthMessageKey =
    | (typeof AUTH_ERROR_KEYS)[keyof typeof AUTH_ERROR_KEYS]
    | 'auth:errors.playServicesUnavailable'
    | 'common:errors.network'
    | 'common:errors.generic';

/**
 * Échec propre à un fournisseur d'identité, porteur de sa clé i18n.
 *
 * Les SDK des fournisseurs ont leurs propres codes d'erreur, et les importer ici
 * ferait entrer un module natif dans un fichier couvert par les tests unitaires.
 * La traduction se fait donc au plus près du SDK (`google-sign-in.ts`), et cette
 * classe transporte le résultat jusqu'à `toAuthMessageKey`.
 */
export class AuthProviderError extends Error {
    constructor(readonly messageKey: AuthMessageKey) {
        super(messageKey);
        this.name = 'AuthProviderError';
    }
}

/**
 * Traduit une erreur Supabase (ou réseau) en clé i18n affichable.
 * Les fonctions du domaine retournent des clés, jamais du texte : la
 * traduction se fait dans l'écran via t() (convention i18n du Lot 5.5).
 */
export function toAuthMessageKey(error: unknown): AuthMessageKey {
    if (error instanceof AuthProviderError) {
        return error.messageKey;
    }
    if (isAuthError(error) && error.code && error.code in AUTH_ERROR_KEYS) {
        return AUTH_ERROR_KEYS[error.code as keyof typeof AUTH_ERROR_KEYS];
    }
    if (error instanceof AuthError && error.status === 429) {
        return 'auth:errors.rateLimited';
    }
    if (error instanceof Error && /network request failed/i.test(error.message)) {
        return 'common:errors.network';
    }
    return 'common:errors.generic';
}
