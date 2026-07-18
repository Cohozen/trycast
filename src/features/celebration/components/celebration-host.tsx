import { useCelebration } from '../use-celebration';
import { CelebrationOverlay } from './celebration-overlay';

/**
 * Hôte monté une fois dans le layout (app) : branche la détection sur l'overlay.
 * Rendu en permanence (le Modal gère sa propre visibilité et son fondu de sortie).
 */
export function CelebrationHost() {
    const { visible, items, totalPoints, dismiss } = useCelebration();
    return (
        <CelebrationOverlay
            items={items}
            onDismiss={dismiss}
            totalPoints={totalPoints}
            visible={visible}
        />
    );
}
