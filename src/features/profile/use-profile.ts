import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

export function useProfile(userId: string) {
    return useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data;
        },
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
 */
export function useDeleteAccount() {
    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
            if (error) throw error;
            // Avant le signOut : après, l'app bascule sur (auth) et démonte
            // l'arbre, ce qui peut couper l'envoi en vol.
            trackEvent({ name: 'account_deleted' });
            await supabase.auth.signOut();
        },
    });
}
