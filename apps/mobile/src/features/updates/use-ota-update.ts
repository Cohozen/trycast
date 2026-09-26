import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { shouldCheckForUpdate, shouldReloadSilently } from './update-policy';

/**
 * Canal EAS du build : chaîne VIDE (et non nulle) hors build distribué, comme
 * le dev client ou un build local. Même garde que la rangée « Mise à jour » des
 * Réglages : hors canal, il n'y a rien à chercher.
 */
const enabled = Boolean(Updates.channel);

/**
 * Cycle des mises à jour à distance au-delà du démarrage à froid : recherche
 * et téléchargement au retour au premier plan, application silencieuse après
 * une longue absence, sinon `pending` pour proposer « Redémarrer ».
 *
 * À monter une seule fois (dans la tab bar, qui reste montée sous les écrans
 * poussés) : chaque instance poserait son propre écouteur.
 */
export function useOtaUpdate() {
    const { isUpdatePending, isRestarting, lastCheckForUpdateTimeSinceRestart } =
        Updates.useUpdates();
    const backgroundedAt = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const sub = AppState.addEventListener('change', (state) => {
            // `inactive` (centre de contrôle iOS, sélecteur d'apps) n'est pas une absence.
            if (state === 'background') {
                backgroundedAt.current = Date.now();
                return;
            }
            if (state !== 'active') return;
            const now = Date.now();
            if (
                shouldReloadSilently({
                    pending: isUpdatePending,
                    backgroundedAt: backgroundedAt.current,
                    now,
                })
            ) {
                Updates.reloadAsync().catch(() => {});
                return;
            }
            backgroundedAt.current = null;
            if (!isUpdatePending && shouldCheckForUpdate(lastCheckForUpdateTimeSinceRestart, now)) {
                // Échecs réseau sans conséquence : on retentera au prochain retour.
                Updates.checkForUpdateAsync()
                    .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
                    .catch(() => {});
            }
        });
        return () => sub.remove();
    }, [isUpdatePending, lastCheckForUpdateTimeSinceRestart]);

    return {
        pending: enabled && isUpdatePending,
        restarting: isRestarting,
        restart: () => {
            Updates.reloadAsync().catch(() => {});
        },
    };
}
