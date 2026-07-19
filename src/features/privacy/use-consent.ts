import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Seul type de consentement du MVP ; le schéma reste extensible ('analytics'…). */
export const COMMUNICATIONS_CONSENT = 'communications';

export type ConsentState = { granted: boolean; created_at: string } | null;

const consentKey = (userId: string) => ['consent', COMMUNICATIONS_CONSENT, userId];

/**
 * État courant du consentement « communications » = ligne la plus récente
 * (table append-only). `null` tant qu'aucun choix n'a été enregistré.
 */
export function useCommunicationsConsent(userId: string) {
    return useQuery<ConsentState>({
        queryKey: consentKey(userId),
        enabled: Boolean(userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('consents')
                .select('granted, created_at')
                .eq('user_id', userId)
                .eq('type', COMMUNICATIONS_CONSENT)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
    });
}

/**
 * Enregistre un nouvel état de consentement (insert append-only : l'historique
 * et la date de recueil sont conservés). Le cache reflète la dernière ligne.
 */
export function useSetCommunicationsConsent(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (granted: boolean) => {
            const { data, error } = await supabase
                .from('consents')
                .insert({ user_id: userId, type: COMMUNICATIONS_CONSENT, granted })
                .select('granted, created_at')
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (row) => {
            queryClient.setQueryData(consentKey(userId), row);
        },
    });
}
