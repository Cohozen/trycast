import type { PushPermission } from '@/features/notifications/derive-notifications-ui';

import type { WelcomeStep } from './types';

type WelcomeContext = {
    permission: PushPermission;
    /** Faux hors build natif sur appareil (émulateur, simulateur, web). */
    pushSupported: boolean;
};

/**
 * Compose les volets du guide. Seul le dernier varie : son bouton dépend de
 * l'état de la permission notifications. Le volet lui-même reste toujours
 * affiché — son texte (« on te rappelle avant le coup d'envoi ») reste vrai
 * quelle que soit la permission, et le retirer ferait sauter un point de
 * progression d'un lancement à l'autre.
 */
export function buildWelcomeSteps({ permission, pushSupported }: WelcomeContext): WelcomeStep[] {
    return [
        { key: 'intro', action: null },
        { key: 'predictions', action: 'rules' },
        { key: 'leagues', action: 'leagues' },
        {
            key: 'notifications',
            action: !pushSupported
                ? null
                : permission === 'granted'
                  ? null
                  : permission === 'denied'
                    ? 'open-os-settings'
                    : 'enable-notifications',
        },
    ];
}
