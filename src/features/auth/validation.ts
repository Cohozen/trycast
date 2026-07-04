// Miroir de la contrainte SQL username_format (profiles)
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export function validateUsername(username: string): string | null {
    if (username.length < 3) {
        return 'Ton pseudo doit faire au moins 3 caractères.';
    }
    if (username.length > 20) {
        return 'Ton pseudo doit faire au plus 20 caractères.';
    }
    if (!USERNAME_PATTERN.test(username)) {
        return 'Lettres, chiffres et _ uniquement (pas d’espaces ni d’accents).';
    }
    return null;
}

export function validateEmail(email: string): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Adresse email invalide.';
    }
    return null;
}

export function validatePassword(password: string): string | null {
    if (password.length < 8) {
        return 'Ton mot de passe doit faire au moins 8 caractères.';
    }
    return null;
}
