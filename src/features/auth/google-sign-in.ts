import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes,
} from '@react-native-google-signin/google-signin';

import { AuthProviderError } from '@/features/auth/errors';

// Seul fichier de l'app à connaître la lib : tout le reste passe par
// `sign-in-with-provider.ts`. Les modules purs (testés sous Vitest) ne doivent
// jamais l'importer, même indirectement — le module natif n'existe pas en test.

let configured = false;

function ensureConfigured() {
    if (configured) return;
    GoogleSignin.configure({
        // C'est bien le client WEB que l'app Android utilise (le client Android
        // ne sert qu'à la validation par empreinte SHA-1, côté Google).
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    configured = true;
}

/**
 * Ouvre la feuille native de choix de compte et renvoie le jeton d'identité.
 *
 * `null` = l'utilisateur a renoncé (fermeture de la feuille, ou double appui
 * pendant qu'une demande est déjà à l'écran). Ce n'est pas une erreur : l'appelant
 * ne doit rien afficher.
 */
export async function signInWithGoogle(): Promise<string | null> {
    ensureConfigured();
    try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) {
            return null;
        }
        const { idToken } = response.data;
        if (!idToken) {
            throw new Error('Google Sign-In : réponse sans idToken');
        }
        return idToken;
    } catch (error) {
        if (isErrorWithCode(error)) {
            if (
                error.code === statusCodes.SIGN_IN_CANCELLED ||
                error.code === statusCodes.IN_PROGRESS
            ) {
                return null;
            }
            if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                throw new AuthProviderError('auth:errors.playServicesUnavailable');
            }
        }
        // Tout le reste part tel quel : `DEVELOPER_ERROR` (empreinte SHA-1 non
        // déclarée) doit rester visible en console et dans Sentry plutôt que
        // d'être maquillé en message générique.
        throw error;
    }
}

/**
 * Ferme la session côté Google. Sans cet appel, la connexion suivante
 * resélectionne le compte sans laisser le choix — déroutant sur un téléphone
 * partagé, et bloquant pour tester plusieurs comptes pendant l'alpha.
 *
 * L'échec est ignoré volontairement : ne jamais empêcher la déconnexion de l'app.
 */
export async function signOutFromGoogle(): Promise<void> {
    try {
        ensureConfigured();
        await GoogleSignin.signOut();
    } catch {
        // sans objet : personne n'était connecté via Google
    }
}
