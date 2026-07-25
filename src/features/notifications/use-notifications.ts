import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { AppNotification } from './types';

// Historique borné : au-delà, l'écran ne se scrolle plus, il se subit.
const HISTORY_LIMIT = 50;

export const notificationsQueryKey = (userId: string | undefined) => ['notifications', userId];

/**
 * Boîte de réception : les notifications réellement envoyées à ce compte,
 * lues comme non lues (l'historique ne se vide jamais). Le filtre sur `title`
 * écarte les lignes d'envoi en échec ou restées en `pending` — elles n'ont
 * jamais atteint l'appareil (cf. 20260725000100_notifications_inbox.sql).
 */
export function useNotifications(userId: string | undefined) {
    return useQuery({
        queryKey: notificationsQueryKey(userId),
        enabled: !!userId,
        queryFn: async (): Promise<AppNotification[]> => {
            const { data, error } = await supabase
                .from('notification_sends')
                .select('id, type, title, body, url, read_at, created_at')
                .not('title', 'is', null)
                .order('created_at', { ascending: false })
                .limit(HISTORY_LIMIT);
            if (error) throw error;
            return (data ?? []).map((row) => ({
                id: row.id,
                type: row.type,
                title: row.title ?? '',
                body: row.body ?? '',
                url: row.url,
                read_at: row.read_at,
                created_at: row.created_at,
            }));
        },
    });
}

/**
 * Nombre de non-lues, dérivé de la même query que la liste : jamais une
 * seconde requête, sinon la pastille et l'écran finissent par se contredire.
 */
export function useUnreadNotificationCount(userId: string | undefined) {
    const query = useNotifications(userId);
    return query.data?.filter((notification) => !notification.read_at).length ?? 0;
}

/**
 * Badge d'icône d'app aligné sur les non-lues. Indispensable côté iOS : le
 * serveur pose le badge à l'envoi, mais il ne peut pas savoir qu'on a lu —
 * c'est l'app qui le redescend. Best effort : Android ne le gère que si le
 * lanceur le supporte, et iOS exige la permission `allowBadge`.
 */
export function useNotificationBadgeSync(userId: string | undefined) {
    const { data } = useNotifications(userId);
    const unread = data?.filter((notification) => !notification.read_at).length ?? 0;

    useEffect(() => {
        if (Platform.OS === 'web' || !data) return;
        Notifications.setBadgeCountAsync(unread).catch(() => {
            // Lanceur Android sans badge, permission iOS refusée : sans effet.
        });
    }, [data, unread]);
}
