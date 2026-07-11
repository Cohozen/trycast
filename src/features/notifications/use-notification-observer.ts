import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import { useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Allowlist des deep links portés par `data.url` des push (émis par l'EF
 * notify, cf. supabase/functions/_shared/notification-messages.ts). Le
 * payload n'est pas fiable par principe : toute URL hors de cette table est
 * ignorée — jamais de navigation arbitraire. Les valeurs sont les routes
 * typées équivalentes, groupes élidés.
 */
const ROUTE_BY_URL: Record<string, Href> = {
    '/(app)/(tabs)/': '/',
    '/(app)/(tabs)/results': '/results',
};

/**
 * Navigue vers l'écran visé au tap d'une notification : app tuée (réponse de
 * lancement, lue une fois la navigation prête) comme app en arrière-plan
 * (listener). Une route dupliquée entre les deux chemins est inoffensive
 * (même onglet).
 */
export function useNotificationObserver() {
    const router = useRouter();
    const navigationReady = !!useRootNavigationState()?.key;

    useEffect(() => {
        if (Platform.OS === 'web' || !navigationReady) return;
        let isMounted = true;

        function redirect(notification: Notifications.Notification) {
            const url = notification.request.content.data?.url;
            const href = typeof url === 'string' ? ROUTE_BY_URL[url] : undefined;
            if (href) {
                router.push(href);
            }
        }

        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (isMounted && response) {
                redirect(response.notification);
            }
        });
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            redirect(response.notification);
        });
        return () => {
            isMounted = false;
            subscription.remove();
        };
    }, [navigationReady, router]);
}
