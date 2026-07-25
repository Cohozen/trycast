import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { AppNotification } from './types';
import { notificationsQueryKey } from './use-notifications';

/** Une notification précise, ou tout ce qui reste non lu. */
export type MarkReadTarget = { ids: string[] } | 'all';

/**
 * Marque comme lu. Aucun filtre sur user_id : la policy RLS
 * notification_sends_update_own s'en charge, et le grant ne porte que sur
 * read_at — impossible de toucher au contenu ou au statut d'envoi.
 */
export async function markNotificationsRead(target: MarkReadTarget): Promise<void> {
    const readAt = new Date().toISOString();
    const query = supabase.from('notification_sends').update({ read_at: readAt });
    const { error } =
        target === 'all' ? await query.is('read_at', null) : await query.in('id', target.ids);
    if (error) throw error;
}

/**
 * Mise à jour optimiste (même réflexe que les préférences de notification) :
 * l'opacité de la ligne change à l'instant du tap, rollback si le serveur
 * refuse.
 */
export function useMarkNotificationsRead(userId: string | undefined) {
    const queryClient = useQueryClient();
    const queryKey = notificationsQueryKey(userId);

    return useMutation({
        mutationFn: markNotificationsRead,
        onMutate: async (target) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
            const readAt = new Date().toISOString();
            queryClient.setQueryData<AppNotification[]>(queryKey, (current) =>
                current?.map((notification) =>
                    notification.read_at ||
                    (target !== 'all' && !target.ids.includes(notification.id))
                        ? notification
                        : { ...notification, read_at: readAt },
                ),
            );
            return { previous };
        },
        onError: (_error, _target, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey });
        },
    });
}
