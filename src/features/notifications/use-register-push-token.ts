import { useEffect } from 'react';

import { loadWelcomeGuideSeen } from '@/features/welcome/welcome-guide-store';

import { registerPushToken } from './register-push-token';

/**
 * Enregistre le token push de l'appareil une fois par session ouverte (même
 * déclencheur que useSyncLocale). Demande la permission au premier lancement
 * connecté ; best-effort silencieux partout ailleurs.
 */
export function useRegisterPushToken(userId: string | undefined) {
    useEffect(() => {
        if (!userId) return;
        void (async () => {
            // Tout premier lancement : c'est le guide d'accueil qui portera la
            // demande, une fois qu'il aura dit à quoi servent les notifications.
            // Sans ça, le dialogue système surgit à froid par-dessus la sheet
            // de bienvenue. Le guide relaie l'appel à sa fermeture.
            if (!(await loadWelcomeGuideSeen())) return;
            await registerPushToken();
        })();
    }, [userId]);
}
