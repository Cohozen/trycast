import type { NotificationPrefs } from './types';

/** État simplifié de la permission OS, dérivé de getPermissionsAsync. */
export type PushPermission = 'granted' | 'undetermined' | 'denied';

export type NotificationsUi = {
    /** Position affichée du master switch (forcé off si l'OS bloque) */
    masterOn: boolean;
    /** L'OS bloque : master non interactif (maquette) */
    masterDisabled: boolean;
    subtitleKey:
        | 'profile:settings.notifications.master.subtitleOn'
        | 'profile:settings.notifications.master.subtitleOff'
        | 'profile:settings.notifications.master.subtitleBlocked';
    /** Bannière « bloquées dans les réglages OS » */
    showBanner: boolean;
    /** Sous-toggles par type, visibles seulement si le master est effectif */
    showToggles: boolean;
};

/**
 * Les trois états de la section Notifications de la maquette Réglages :
 * permission OS refusée (bannière, tout éteint), master off (tout coupé),
 * master on (choix par type).
 */
export function deriveNotificationsUi(
    permission: PushPermission,
    prefs: NotificationPrefs,
): NotificationsUi {
    const blocked = permission === 'denied';
    const masterOn = !blocked && prefs.master;
    return {
        masterOn,
        masterDisabled: blocked,
        subtitleKey: blocked
            ? 'profile:settings.notifications.master.subtitleBlocked'
            : masterOn
              ? 'profile:settings.notifications.master.subtitleOn'
              : 'profile:settings.notifications.master.subtitleOff',
        showBanner: blocked,
        showToggles: masterOn,
    };
}
