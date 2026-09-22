import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { notificationHref } from './notification-href';

/**
 * Ouvre la cible d'une notification, qu'elle vienne de la barre système ou de
 * l'écran Notifications — même allowlist des deux côtés (notificationHref).
 */
export function useNotificationDeepLink() {
    const router = useRouter();

    return useCallback(
        (url: string | null | undefined) => {
            const href = notificationHref(url);
            if (href) {
                router.push(href);
            }
        },
        [router],
    );
}
