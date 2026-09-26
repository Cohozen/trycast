import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';

import { RESUME_SETTLE_MS, shouldCheckForUpdate, shouldReloadSilently } from './update-policy';

/**
 * Canal EAS du build : chaîne VIDE (et non nulle) hors build distribué, comme
 * le dev client ou un build local. Même garde que la rangée « Mise à jour » des
 * Réglages : hors canal, il n'y a rien à chercher.
 */
const enabled = Boolean(Updates.channel);

/**
 * Cycle des mises à jour à distance au-delà du démarrage à froid : recherche
 * et téléchargement au retour au premier plan, application silencieuse après
 * une longue absence (sauf réouverture par un lien ou une notification),
 * sinon `pending` pour proposer « Redémarrer ».
 *
 * À monter une seule fois (dans la tab bar, qui reste montée sous les écrans
 * poussés) : chaque instance poserait son propre écouteur.
 */
export function useOtaUpdate() {
    const { isUpdatePending, isRestarting, lastCheckForUpdateTimeSinceRestart } =
        Updates.useUpdates();
    const backgroundedAt = useRef<number | null>(null);
    const linkedAt = useRef<number | null>(null);
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Lien d'invitation ou tap de notification : l'app a une destination, un
    // rechargement silencieux risquerait de la perdre.
    useEffect(() => {
        if (!enabled) return;
        const markLinked = () => {
            linkedAt.current = Date.now();
        };
        const url = Linking.addEventListener('url', markLinked);
        const response = Notifications.addNotificationResponseReceivedListener(markLinked);
        return () => {
            url.remove();
            response.remove();
        };
    }, []);

    useEffect(() => {
        if (!enabled) return;
        const clearSettle = () => {
            if (settleTimer.current) clearTimeout(settleTimer.current);
            settleTimer.current = null;
        };
        const sub = AppState.addEventListener('change', (state) => {
            // `inactive` (centre de contrôle iOS, sélecteur d'apps) n'est pas une absence.
            if (state === 'background') {
                clearSettle();
                backgroundedAt.current = Date.now();
                return;
            }
            if (state !== 'active') return;
            const resumedAt = Date.now();
            if (isUpdatePending) {
                // Décision différée : le lien qui a rouvert l'app peut arriver
                // après le passage à `active`. Sans rechargement, le toast reste.
                clearSettle();
                settleTimer.current = setTimeout(() => {
                    settleTimer.current = null;
                    const reload = shouldReloadSilently({
                        pending: true,
                        backgroundedAt: backgroundedAt.current,
                        linkedAt: linkedAt.current,
                        now: resumedAt,
                    });
                    backgroundedAt.current = null;
                    if (reload) Updates.reloadAsync().catch(() => {});
                }, RESUME_SETTLE_MS);
                return;
            }
            backgroundedAt.current = null;
            if (shouldCheckForUpdate(lastCheckForUpdateTimeSinceRestart, resumedAt)) {
                // Échecs réseau sans conséquence : on retentera au prochain retour.
                Updates.checkForUpdateAsync()
                    .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
                    .catch(() => {});
            }
        });
        return () => {
            sub.remove();
            clearSettle();
        };
    }, [isUpdatePending, lastCheckForUpdateTimeSinceRestart]);

    return {
        pending: enabled && isUpdatePending,
        restarting: isRestarting,
        restart: () => {
            Updates.reloadAsync().catch(() => {});
        },
    };
}
