import { useMutation, useQueryClient } from '@tanstack/react-query';

import { trackEvent } from '@/lib/analytics';
import type { SignInMethod } from '@/lib/analytics-events';
import { supabase } from '@/lib/supabase';

/**
 * Revendication du pseudo à la première connexion via un fournisseur d'identité.
 *
 * Passe par la RPC `claim_username` et non par un update direct : elle seule peut
 * écrire `username_chosen` (hors des grants colonne du client), et elle évite la
 * course « vérifier la disponibilité puis écrire » — l'unicité est tranchée par
 * l'index, dont l'erreur 23505 est traduite par `toProfileMessageKey`.
 *
 * L'ordre du `onSuccess` compte : écrire le profil en cache fait aussitôt
 * basculer `Stack.Protected` sur `(app)` et démonte l'écran appelant. Tout ce
 * qui doit partir (ici la mesure d'usage) le fait donc avant — même piège que
 * `useDeleteAccount` et `useResetPassword`.
 */
export function useClaimUsername(userId: string | undefined, method: SignInMethod) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (candidate: string) => {
            const { data, error } = await supabase.rpc('claim_username', { candidate });
            if (error) throw error;
            return data;
        },
        onSuccess: (profile) => {
            // C'est ici, et pas au retour du fournisseur, que le compte devient
            // utilisable : avant le pseudo, il n'a pas d'identité dans l'app.
            trackEvent({ name: 'account_created', props: { method } });
            queryClient.setQueryData(['profile', userId], profile);
        },
    });
}
