import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from './types';

const queryKey = (userId: string) => ['notification-prefs', userId];

/** Préférences de notification. Absence de ligne en DB = tout activé. */
export function useNotificationPreferences(userId: string) {
    return useQuery({
        queryKey: queryKey(userId),
        queryFn: async (): Promise<NotificationPrefs> => {
            const { data, error } = await supabase
                .from('notification_prefs')
                .select('master, reminder_enabled, results_enabled')
                .eq('user_id', userId)
                .maybeSingle();
            if (error) throw error;
            if (!data) return DEFAULT_NOTIFICATION_PREFS;
            return {
                master: data.master,
                reminderEnabled: data.reminder_enabled,
                resultsEnabled: data.results_enabled,
            };
        },
    });
}

/**
 * Upsert optimiste des préférences (mêmes réflexes que l'auto-save des
 * pronos) : le toggle bascule immédiatement, rollback si le serveur refuse.
 */
export function useUpdateNotificationPreferences(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (prefs: NotificationPrefs) => {
            const { error } = await supabase.from('notification_prefs').upsert(
                {
                    user_id: userId,
                    master: prefs.master,
                    reminder_enabled: prefs.reminderEnabled,
                    results_enabled: prefs.resultsEnabled,
                },
                { onConflict: 'user_id' },
            );
            if (error) throw error;
            return prefs;
        },
        onMutate: async (prefs) => {
            await queryClient.cancelQueries({ queryKey: queryKey(userId) });
            const previous = queryClient.getQueryData<NotificationPrefs>(queryKey(userId));
            queryClient.setQueryData(queryKey(userId), prefs);
            return { previous };
        },
        onError: (_error, _prefs, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey(userId), context.previous);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKey(userId) });
        },
    });
}
