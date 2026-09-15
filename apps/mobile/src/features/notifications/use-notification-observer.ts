import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { MARK_READ_ACTION } from './notification-categories';
import { markNotificationsRead } from './use-mark-notifications-read';
import { useNotificationDeepLink } from './use-notification-deep-link';
import { notificationsQueryKey } from './use-notifications';

/**
 * Traite les réponses aux notifications : tap sur le corps, bouton qui ouvre
 * l'app, bouton « Marquer comme lu ». Couvre l'app tuée (réponse de lancement,
 * lue une fois la navigation prête) comme l'app en arrière-plan (listener).
 * Une route dupliquée entre les deux chemins est inoffensive (même onglet).
 *
 * ⚠️ Limite de plateforme : le bouton « Marquer comme lu » est silencieux
 * (`opensAppToForeground: false`), donc il n'exécute aucun JS si l'app est
 * complètement tuée — l'appui est alors perdu et la notification reste non lue.
 * Les deux autres chemins ouvrent l'app, et sont fiables dans tous les états.
 */
export function useNotificationObserver(userId: string | undefined) {
    const queryClient = useQueryClient();
    const openDeepLink = useNotificationDeepLink();
    const navigationReady = !!useRootNavigationState()?.key;

    useEffect(() => {
        if (Platform.OS === 'web' || !navigationReady) return;
        let isMounted = true;

        function handle(response: Notifications.NotificationResponse) {
            const data = response.notification.request.content.data;
            const id = typeof data?.id === 'string' ? data.id : undefined;

            // Best effort : hors ligne, la notification reste simplement non lue.
            if (id) {
                markNotificationsRead({ ids: [id] })
                    .then(() => {
                        queryClient.invalidateQueries({
                            queryKey: notificationsQueryKey(userId),
                        });
                    })
                    .catch(() => {});
            }

            // « Marquer comme lu » ne navigue pas : l'app n'est pas au premier
            // plan, la faire changer d'écran dans le dos de l'utilisateur
            // serait une surprise au prochain retour.
            if (response.actionIdentifier === MARK_READ_ACTION) return;
            openDeepLink(typeof data?.url === 'string' ? data.url : undefined);
        }

        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (isMounted && response) {
                handle(response);
            }
        });
        const subscription = Notifications.addNotificationResponseReceivedListener(handle);
        return () => {
            isMounted = false;
            subscription.remove();
        };
    }, [navigationReady, openDeepLink, queryClient, userId]);
}
