import { signInWithApple } from '@/features/auth/apple-sign-in';
import { signInWithGoogle, signOutFromGoogle } from '@/features/auth/google-sign-in';
import type { OAuthProvider, OAuthProviderId } from '@/features/auth/providers';
import { signInWithWebRedirect } from '@/features/auth/web-oauth';
import { supabase } from '@/lib/supabase';

/**
 * `cancelled` couvre tous les renoncements (feuille fermée, navigateur fermé,
 * double appui) : l'appelant ne doit afficher aucun message dans ce cas.
 */
export type ProviderSignInResult = 'success' | 'cancelled';

type IdTokenCredential = { idToken: string; nonce?: string };

/**
 * Feuille native du fournisseur → jeton d'identité, ou `null` si renoncement.
 *
 * `nonce` n'existe que si le fournisseur en a inscrit un dans le jeton : GoTrue
 * exige qu'ils soient vides ou fournis tous les deux. Google n'en porte pas (la
 * feuille native Android n'en demande pas), Apple si.
 */
async function requestIdToken(id: OAuthProviderId): Promise<IdTokenCredential | null> {
    switch (id) {
        case 'google': {
            const idToken = await signInWithGoogle();
            return idToken === null ? null : { idToken };
        }
        case 'apple':
            return signInWithApple();
    }
}

/**
 * Ouvre une session Supabase avec un fournisseur d'identité, quelle que soit sa
 * mécanique. Pas de redirection à faire ensuite : `Stack.Protected` bascule seul
 * dès que la session existe (même contrat que la connexion par mot de passe).
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<ProviderSignInResult> {
    if (provider.flow === 'web-redirect') {
        return signInWithWebRedirect(provider.id);
    }

    const credential = await requestIdToken(provider.id);
    if (credential === null) {
        return 'cancelled';
    }

    const { error } = await supabase.auth.signInWithIdToken({
        provider: provider.id,
        token: credential.idToken,
        nonce: credential.nonce,
    });
    if (error) throw error;

    return 'success';
}

/**
 * Ferme les sessions côté fournisseurs, à appeler avant `supabase.auth.signOut()`.
 * Sans elle, la connexion suivante resélectionne le compte sans laisser le choix.
 */
export async function signOutFromProviders(): Promise<void> {
    await signOutFromGoogle();
}
