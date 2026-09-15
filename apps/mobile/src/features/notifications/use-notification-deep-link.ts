import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Allowlist des deep links portés par `data.url` des push (émis par l'EF
 * notify, cf. supabase/functions/_shared/notification-messages.ts) et recopiés
 * dans `notification_sends.url` pour l'historique. Le payload n'est pas fiable
 * par principe : toute URL hors de cette table est ignorée — jamais de
 * navigation arbitraire. Les valeurs sont les routes typées équivalentes,
 * groupes élidés.
 */
const ROUTE_BY_URL: Record<string, Href> = {
    '/(app)/(tabs)/': '/',
    '/(app)/(tabs)/results': '/results',
};

/**
 * Ouvre la cible d'une notification, qu'elle vienne de la barre système ou de
 * l'écran Notifications — même allowlist des deux côtés.
 */
export function useNotificationDeepLink() {
    const router = useRouter();

    return useCallback(
        (url: string | null | undefined) => {
            const href = typeof url === 'string' ? ROUTE_BY_URL[url] : undefined;
            if (href) {
                router.push(href);
            }
        },
        [router],
    );
}
