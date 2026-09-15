import { useEffect, useState } from 'react';
import {
    Easing,
    useAnimatedReaction,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/tw';
import { cn } from '@/tw/variants';

const DURATION = 900;

type AnimatedPointsCounterProps = {
    /** Valeur cible (total de points gagnés). */
    value: number;
    className?: string;
};

/**
 * Compteur 0 → total animé. Une valeur partagée est interpolée par
 * `withTiming` ; `useAnimatedReaction` pousse l'entier courant vers l'état JS
 * via `scheduleOnRN` (même passerelle UI→JS que le splash overlay), ce qui
 * laisse le rendu passer par le DS (Anton + grenat via className).
 * `useReducedMotion` fige la valeur finale.
 */
export function AnimatedPointsCounter({ value, className }: AnimatedPointsCounterProps) {
    const reducedMotion = useReducedMotion();
    const progress = useSharedValue(0);
    const [animated, setAnimated] = useState(0);
    // Dérivé (pas de setState dans l'effet) : en reduced motion on affiche
    // directement la cible, sinon la valeur poussée par la réaction.
    const display = reducedMotion ? value : animated;

    useEffect(() => {
        if (reducedMotion) {
            return;
        }
        progress.value = 0;
        progress.value = withTiming(value, {
            duration: DURATION,
            easing: Easing.out(Easing.cubic),
        });
    }, [value, reducedMotion, progress]);

    useAnimatedReaction(
        () => Math.round(progress.value),
        (current, previous) => {
            if (current !== previous) {
                scheduleOnRN(setAnimated, current);
            }
        },
    );

    return (
        <Text className={cn('font-display text-[76px] leading-[80px] text-accent', className)}>
            {display}
        </Text>
    );
}
