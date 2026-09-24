import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

// Seul fichier de l'app à connaître la lib : tout le reste passe par
// `sign-in-with-provider.ts`. Les modules purs (testés sous Vitest) ne doivent
// jamais l'importer, même indirectement — le module natif n'existe pas en test.

export type AppleCredential = {
    idToken: string;
    /** Nonce en clair, à transmettre à Supabase qui le compare au haché du jeton. */
    nonce: string;
};

/**
 * Ouvre la feuille native Sign in with Apple et renvoie le jeton d'identité.
 *
 * Le nonce protège contre le rejeu d'un jeton intercepté : Apple reçoit son
 * SHA-256 et l'inscrit dans le jeton, Supabase reçoit la valeur brute et
 * vérifie la correspondance.
 *
 * Seule l'adresse e-mail est demandée, pas le nom : il ne serait jamais
 * affiché (le pseudo est choisi dans l'app, cf. registre des traitements).
 *
 * `null` = l'utilisateur a renoncé. Ce n'est pas une erreur : l'appelant ne
 * doit rien afficher.
 */
export async function signInWithApple(): Promise<AppleCredential | null> {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
    );
    try {
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
            nonce: hashedNonce,
        });
        if (!credential.identityToken) {
            throw new Error('Sign in with Apple : réponse sans identityToken');
        }
        return { idToken: credential.identityToken, nonce: rawNonce };
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
            return null;
        }
        throw error;
    }
}
