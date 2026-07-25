import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/lib/i18n';

/**
 * Catégories d'actions : les boutons affichés sous une notification. Les
 * identifiants doivent correspondre au `categoryId` posé par l'EF notify
 * (supabase/functions/_shared/notification-messages.ts).
 *
 * ⚠️ Ni « : » ni « - » dans un identifiant de catégorie : les actions ne
 * s'afficheraient pas (contrainte documentée d'expo-notifications).
 *
 * Différences de plateforme assumées :
 * - Android affiche les boutons directement sous la notification ;
 * - iOS ne les révèle qu'après un appui long (ou en tirant la notification).
 */
export const REMINDER_CATEGORY = 'reminder';
export const RESULT_CATEGORY = 'result';

/** Marque comme lu sans ouvrir l'app — traité par use-notification-observer. */
export const MARK_READ_ACTION = 'markRead';
/** Ouvre l'app sur l'écran des pronos. */
export const PREDICT_ACTION = 'predict';
/** Ouvre l'app sur l'écran des résultats. */
export const POINTS_ACTION = 'points';

/**
 * `opensAppToForeground: false` = action silencieuse. Elle n'aboutit que si
 * l'app tourne encore (premier plan ou arrière-plan) : app tuée, le JS ne
 * s'exécute pas et l'appui est perdu. Dégradation acceptée — la notification
 * reste simplement non lue dans l'historique.
 *
 * Construite à l'appel, jamais au scope module : au chargement du module, la
 * langue choisie dans Réglages n'est pas encore appliquée.
 */
function markReadAction(): Notifications.NotificationAction {
    return {
        identifier: MARK_READ_ACTION,
        buttonTitle: i18n.t('notifications:actions.markRead'),
        options: { opensAppToForeground: false },
    };
}

/**
 * Enregistre les catégories d'actions. À appeler au démarrage, avant toute
 * arrivée de notification : une catégorie inconnue de l'appareil au moment de
 * la réception donne une notification sans bouton.
 *
 * Les libellés sont figés à l'enregistrement — d'où le ré-appel à chaque
 * changement de langue (effet piloté par `i18n.language` dans src/app/_layout.tsx).
 */
export async function setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
        await Promise.all([
            Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
                {
                    identifier: PREDICT_ACTION,
                    buttonTitle: i18n.t('notifications:actions.predict'),
                    options: { opensAppToForeground: true },
                },
                markReadAction(),
            ]),
            Notifications.setNotificationCategoryAsync(RESULT_CATEGORY, [
                {
                    identifier: POINTS_ACTION,
                    buttonTitle: i18n.t('notifications:actions.points'),
                    options: { opensAppToForeground: true },
                },
                markReadAction(),
            ]),
        ]);
    } catch (error) {
        if (__DEV__) {
            console.warn('Enregistrement des catégories de notification échoué :', error);
        }
    }
}
