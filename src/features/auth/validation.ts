/** Clé i18n d'une erreur de validation auth, à passer à t() côté écran. */
export type AuthValidationKey =
    | 'auth:validation.usernameTooShort'
    | 'auth:validation.usernameTooLong'
    | 'auth:validation.usernameCharset'
    | 'auth:validation.invalidEmail'
    | 'auth:validation.passwordTooShort'
    | 'auth:validation.passwordMismatch';

// Miroir de la contrainte SQL username_format (profiles)
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export function validateUsername(username: string): AuthValidationKey | null {
    if (username.length < 3) {
        return 'auth:validation.usernameTooShort';
    }
    if (username.length > 20) {
        return 'auth:validation.usernameTooLong';
    }
    if (!USERNAME_PATTERN.test(username)) {
        return 'auth:validation.usernameCharset';
    }
    return null;
}

export function validateEmail(email: string): AuthValidationKey | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'auth:validation.invalidEmail';
    }
    return null;
}

export function validatePassword(password: string): AuthValidationKey | null {
    if (password.length < 8) {
        return 'auth:validation.passwordTooShort';
    }
    return null;
}

export function validatePasswordConfirmation(
    password: string,
    confirmation: string,
): AuthValidationKey | null {
    if (password !== confirmation) {
        return 'auth:validation.passwordMismatch';
    }
    return null;
}
