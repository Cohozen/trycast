import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { signInMethods } from '@/features/auth/identity';
import { providersToRevoke } from '@/features/auth/providers';
import { useSession } from '@/features/auth/session-context';
import { requestRevocationCodes } from '@/features/auth/sign-in-with-provider';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

/**
 * `userId` optionnel : le navigateur racine interroge le profil dès qu'une
 * session existe, avant même de savoir s'il faut afficher l'app ou l'écran de
 * choix du pseudo. La requête reste désactivée tant qu'il n'y a personne.
 */
export function useProfile(userId: string | undefined) {
    return useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId as string)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: Boolean(userId),
    });
}

export function useUpdateUsername(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (username: string) => {
            const { data, error } = await supabase
                .from('profiles')
                .update({ username })
                .eq('id', userId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (profile) => {
            queryClient.setQueryData(['profile', userId], profile);
        },
    });
}

/**
 * Suppression de compte (exigence Apple) : Edge Function `delete-account`
 * (service_role côté serveur), puis nettoyage de la session locale.
 *
 * Un compte Sign in with Apple passe d'abord par la feuille Apple : son code
 * permet à l'EF de révoquer le jeton (règle 5.1.1(v)). Renoncer à la feuille
 * annule la suppression : la mutation rend `'cancelled'`, sans erreur.
 */
export function useDeleteAccount() {
    const { session } = useSession();
    return useMutation({
        mutationFn: async (): Promise<'deleted' | 'cancelled'> => {
            const revocationCodes = await requestRevocationCodes(
                providersToRevoke(signInMethods(session?.user)),
            );
            if (revocationCodes === null) return 'cancelled';

            const { error } = await supabase.functions.invoke('delete-account', {
                method: 'POST',
                body: { revocationCodes },
            });
            if (error) throw error;
            // Avant le signOut : après, l'app bascule sur (auth) et démonte
            // l'arbre, ce qui peut couper l'envoi en vol.
            trackEvent({ name: 'account_deleted' });
            await supabase.auth.signOut();
            return 'deleted';
        },
    });
}
