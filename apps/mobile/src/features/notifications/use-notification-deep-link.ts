import { router } from 'expo-router';
import { useCallback } from 'react';

import { notificationHref } from './notification-href';

/**
 * Ouvre la cible d'une notification, qu'elle vienne de la barre système ou de
 * l'écran Notifications — même allowlist des deux côtés (notificationHref).
 *
 * Le `router` impératif, et non `useRouter()` : ce dernier change d'identité à
 * chaque navigation, et un callback instable relançait l'effet de
 * `useNotificationObserver` en boucle au démarrage à froid.
 */
export function useNotificationDeepLink() {
    return useCallback((url: string | null | undefined) => {
        const href = notificationHref(url);
        if (href) {
            router.push(href);
        }
    }, []);
}
