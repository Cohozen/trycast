import { signInWithGoogle, signOutFromGoogle } from '@/features/auth/google-sign-in';
import type { OAuthProvider, OAuthProviderId } from '@/features/auth/providers';
import { signInWithWebRedirect } from '@/features/auth/web-oauth';
import { supabase } from '@/lib/supabase';

/**
 * `cancelled` couvre tous les renoncements (feuille fermée, navigateur fermé,
 * double appui) : l'appelant ne doit afficher aucun message dans ce cas.
 */
export type ProviderSignInResult = 'success' | 'cancelled';

/** Feuille native du fournisseur → jeton d'identité, ou `null` si renoncement. */
async function requestIdToken(id: OAuthProviderId): Promise<string | null> {
    switch (id) {
        case 'google':
            return signInWithGoogle();
        case 'apple':
            // Branche à écrire avec `expo-apple-authentication` en même temps que
            // l'entrée `apple` de `providers.ts` : tant qu'elle n'y figure pas,
            // aucun appelant ne peut arriver ici.
            throw new Error("Sign in with Apple n'est pas encore branché");
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

    const idToken = await requestIdToken(provider.id);
    if (idToken === null) {
        return 'cancelled';
    }

    const { error } = await supabase.auth.signInWithIdToken({
        provider: provider.id,
        token: idToken,
        // Pas de `nonce` : la feuille native Android n'en demande pas, le jeton
        // n'en porte donc aucun. GoTrue exige que les deux soient vides ou tous
        // deux fournis — inutile d'activer « Skip nonce check » côté Supabase.
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
