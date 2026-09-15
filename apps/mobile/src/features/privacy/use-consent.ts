import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Types de consentement historisés côté serveur. La table `consents` est
 * append-only : chaque bascule insère une ligne, ce qui conserve la date de
 * recueil de chaque état (exigence RGPD).
 *
 * ⚠️ Pour 'analytics' et 'diagnostics', ces lignes sont une **trace**, pas le
 * garde-fou : les SDK démarrent avant toute session. Ce qui coupe réellement
 * les envois est la préférence locale (`telemetry-preference.ts`).
 */
export const CONSENT_TYPES = ['communications', 'analytics', 'diagnostics'] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

/** Conservé pour la lisibilité des appelants historiques. */
export const COMMUNICATIONS_CONSENT: ConsentType = 'communications';

export type ConsentState = { granted: boolean; created_at: string } | null;

const consentKey = (type: ConsentType, userId: string) => ['consent', type, userId];

/**
 * État courant d'un consentement = ligne la plus récente pour (user, type).
 * `null` tant qu'aucun choix n'a été enregistré.
 */
export function useConsent(userId: string, type: ConsentType) {
    return useQuery<ConsentState>({
        queryKey: consentKey(type, userId),
        enabled: Boolean(userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('consents')
                .select('granted, created_at')
                .eq('user_id', userId)
                .eq('type', type)
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
export function useSetConsent(userId: string, type: ConsentType) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (granted: boolean) => {
            const { data, error } = await supabase
                .from('consents')
                .insert({ user_id: userId, type, granted })
                .select('granted, created_at')
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (row) => {
            queryClient.setQueryData(consentKey(type, userId), row);
        },
    });
}

export function useCommunicationsConsent(userId: string) {
    return useConsent(userId, COMMUNICATIONS_CONSENT);
}

export function useSetCommunicationsConsent(userId: string) {
    return useSetConsent(userId, COMMUNICATIONS_CONSENT);
}
