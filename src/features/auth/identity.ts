import type { OAuthProviderId } from '@/features/auth/providers';

/** Moyen par lequel un compte peut s'authentifier. */
export type SignInMethod = 'email' | OAuthProviderId;

/**
 * Forme minimale attendue d'un `User` Supabase. Structurelle plutôt que le type
 * `User` complet : les tests décrivent alors un compte en trois lignes.
 */
type IdentityCarrier = {
    identities?: { provider: string }[] | null;
    app_metadata?: { provider?: string; providers?: string[] };
};

const KNOWN: SignInMethod[] = ['email', 'google', 'apple'];

function isKnown(provider: string): provider is SignInMethod {
    return (KNOWN as string[]).includes(provider);
}

/**
 * Moyens de connexion rattachés au compte, sans doublon et dans l'ordre où
 * Supabase les expose.
 *
 * `identities` fait foi (c'est la liste des identités liées) ; `app_metadata`
 * sert de repli, certains jetons anciens n'exposant pas `identities`. Un
 * fournisseur inconnu de l'app est ignoré plutôt que remonté tel quel : rien
 * dans l'UI ne saurait le nommer.
 */
export function signInMethods(user: IdentityCarrier | null | undefined): SignInMethod[] {
    if (!user) return [];

    const raw = user.identities?.length
        ? user.identities.map((identity) => identity.provider)
        : (user.app_metadata?.providers ??
          (user.app_metadata?.provider ? [user.app_metadata.provider] : []));

    return [...new Set(raw.filter(isKnown))];
}

/**
 * Le compte a-t-il un mot de passe ? Détermine si les rangées « E-mail » et
 * « Mot de passe » des Réglages ont un sens : sur un compte créé via un
 * fournisseur, il n'y a pas de mot de passe à changer, et modifier l'adresse
 * romprait la correspondance d'e-mail qui porte la liaison d'identité.
 */
export function hasPasswordIdentity(user: IdentityCarrier | null | undefined): boolean {
    return signInMethods(user).includes('email');
}
