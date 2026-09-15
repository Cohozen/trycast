import { useMutation } from '@tanstack/react-query';

import type { OAuthProvider } from '@/features/auth/providers';
import { signInWithProvider } from '@/features/auth/sign-in-with-provider';
import { trackEvent } from '@/lib/analytics';

/**
 * Connexion par fournisseur d'identité, pour l'écran d'authentification.
 *
 * Rien à faire du résultat côté écran : `Stack.Protected` bascule sur `(app)`
 * dès que la session existe, et sur l'écran de choix du pseudo si le compte
 * vient d'être créé. Un renoncement (`cancelled`) n'est pas une erreur et ne
 * doit rien afficher — d'où le résultat explicite plutôt qu'une exception.
 *
 * `variables` (exposé par TanStack pendant la mutation) porte le fournisseur en
 * cours : c'est ce qui permet de n'animer que le bouton sur lequel on a appuyé.
 */
export function useOAuthSignIn() {
    return useMutation({
        mutationFn: (provider: OAuthProvider) => signInWithProvider(provider),
        onSuccess: (result, provider) => {
            if (result === 'success') {
                trackEvent({ name: 'signed_in', props: { method: provider.id } });
            }
        },
    });
}
