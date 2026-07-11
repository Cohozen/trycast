import { useEffect } from 'react';

import { registerPushToken } from './register-push-token';

/**
 * Enregistre le token push de l'appareil une fois par session ouverte (même
 * déclencheur que useSyncLocale). Demande la permission au premier lancement
 * connecté ; best-effort silencieux partout ailleurs.
 */
export function useRegisterPushToken(userId: string | undefined) {
    useEffect(() => {
        if (!userId) return;
        void registerPushToken();
    }, [userId]);
}
