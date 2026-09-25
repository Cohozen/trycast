import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { MARK_READ_ACTION } from './notification-categories';
import { markNotificationsRead } from './use-mark-notifications-read';
import { useNotificationDeepLink } from './use-notification-deep-link';
import { notificationsQueryKey } from './use-notifications';

/**
 * Traite les réponses aux notifications : tap sur le corps, bouton qui ouvre
 * l'app, bouton « Marquer comme lu ». Couvre l'app tuée (réponse de lancement)
 * comme l'app en arrière-plan (listener).
 *
 * `ready` = la navigation de l'app est rendue (même condition que la levée du
 * splash dans `_layout.tsx`). La clé de `useRootNavigationState()` ne suffit
 * pas : elle existe dès le lancement, pendant que le layout racine rend encore
 * `null`, et un `router.push` à ce moment laissait l'app figée sur le splash
 * (vécu sur iPhone, 2026-09-25). Une réponse traitée est effacée, pour qu'un
 * nouveau passage de l'effet ne la rejoue pas.
 *
 * ⚠️ Limite de plateforme : le bouton « Marquer comme lu » est silencieux
 * (`opensAppToForeground: false`), donc il n'exécute aucun JS si l'app est
 * complètement tuée — l'appui est alors perdu et la notification reste non lue.
 * Les deux autres chemins ouvrent l'app, et sont fiables dans tous les états.
 */
export function useNotificationObserver(userId: string | undefined, ready: boolean) {
    const queryClient = useQueryClient();
    const openDeepLink = useNotificationDeepLink();

    useEffect(() => {
        if (Platform.OS === 'web' || !ready) return;

        function handle(response: Notifications.NotificationResponse) {
            Notifications.clearLastNotificationResponse();
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

        const launchResponse = Notifications.getLastNotificationResponse();
        if (launchResponse) {
            handle(launchResponse);
        }
        const subscription = Notifications.addNotificationResponseReceivedListener(handle);
        return () => subscription.remove();
    }, [ready, openDeepLink, queryClient, userId]);
}
