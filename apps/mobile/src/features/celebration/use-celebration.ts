import { useRootNavigationState } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from '@/features/auth/session-context';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';

import { buildCelebrationItems } from './build-celebration-items';
import {
    type CelebratedState,
    loadCelebratedState,
    saveCelebratedState,
    withCelebrated,
} from './celebrated-matches-store';
import type { CelebrationItem } from './types';

export type Celebration = {
    visible: boolean;
    items: CelebrationItem[];
    totalPoints: number;
    dismiss: () => void;
};

/**
 * Détecte, à la première connexion, les pronos gagnés depuis la dernière
 * visite et pilote l'overlay de célébration. Tout se calcule en local à partir
 * des données déjà en cache (aucun appel réseau dédié). L'évaluation n'a lieu
 * qu'une fois par montage (ref `evaluated`) : un scoring reçu via Realtime en
 * pleine navigation ne fait pas surgir l'overlay — il attend le prochain
 * lancement, ce qui colle à « à la première connexion ». L'état « déjà vu »
 * vit dans une ref (jamais rendu) : dismiss lit/écrit directement le store.
 * Tout est rangé par compte : `evaluated` retient le compte évalué, pour qu'un
 * changement de compte relance l'évaluation sur le store du nouveau.
 */
export function useCelebration(): Celebration {
    const competition = useActiveCompetition();
    const competitionId = competition.data?.id;
    const predictions = useMyPredictions(competitionId);
    const matches = useMatches(competitionId);
    const navigationReady = !!useRootNavigationState()?.key;
    const userId = useSession().session?.user.id;

    const storedRef = useRef<CelebratedState | null>(null);
    const evaluated = useRef<string | null>(null);
    const [items, setItems] = useState<CelebrationItem[]>([]);
    const [visible, setVisible] = useState(false);

    const predictionsData = predictions.data;
    const matchesData = matches.data;

    useEffect(() => {
        if (
            !navigationReady ||
            !userId ||
            predictionsData === undefined ||
            matchesData === undefined ||
            evaluated.current === userId
        ) {
            return;
        }
        evaluated.current = userId;
        let cancelled = false;

        void (async () => {
            const state = await loadCelebratedState(userId);
            if (cancelled) {
                return;
            }
            storedRef.current = state;
            const pending = buildCelebrationItems(
                predictionsData,
                matchesData,
                new Set(state.matchIds),
            );

            if (!state.initialized) {
                // Première visite du compte sur l'appareil : on absorbe
                // l'historique sans rien afficher.
                const baseline = withCelebrated(
                    state,
                    pending.map((item) => item.matchId),
                );
                storedRef.current = baseline;
                await saveCelebratedState(userId, baseline);
                return;
            }
            if (pending.length === 0) {
                return;
            }
            setItems(pending);
            setVisible(true);
        })();

        return () => {
            cancelled = true;
        };
    }, [navigationReady, userId, predictionsData, matchesData]);

    const totalPoints = useMemo(() => items.reduce((sum, item) => sum + item.points, 0), [items]);

    function dismiss() {
        setVisible(false);
        if (!userId) {
            return;
        }
        const base = storedRef.current ?? { initialized: true, matchIds: [] };
        const next = withCelebrated(
            base,
            items.map((item) => item.matchId),
        );
        storedRef.current = next;
        void saveCelebratedState(userId, next);
    }

    return { visible, items, totalPoints, dismiss };
}
