import { type Component, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type Animated from 'react-native-reanimated';
import {
    type AnimatedRef,
    type SharedValue,
    useAnimatedRef,
    useDerivedValue,
    useScrollOffset,
} from 'react-native-reanimated';

type CollapseRange = {
    /** Défilement (px) à partir duquel le repli commence. */
    start: number;
    /** Distance (px) sur laquelle le repli va de 0 à 1. */
    distance: number;
    /**
     * Défilement (px) qui doit toujours rester possible, même sur une page
     * courte : de quoi replier le header ET sortir le bloc estompé de la vue
     * (sinon il laisse un blanc sous la barre). Défaut : start + distance.
     */
    reach?: number;
};

/**
 * Progression d'un header repliable, de 0 (déplié) à 1 (replié), lue sur le
 * thread UI. `scrollRef` se pose sur une ScrollView réanimée — `Screen` en est
 * une (KeyboardAwareScrollView) — ou une `Animated.FlatList` (type en paramètre). Pas de prop `onScroll` : un handler réanimé
 * passé à KeyboardAwareScrollView casse en « Cannot copy value of type
 * WorkletEventHandlerNative ».
 */
export function useCollapseProgress<TScroll extends Component = Animated.ScrollView>({
    start,
    distance,
    reach = start + distance,
}: CollapseRange): {
    progress: SharedValue<number>;
    /** Défilement brut (px), pour un bloc qui se replie au pixel près. */
    offset: SharedValue<number>;
    scrollRef: AnimatedRef<TScroll>;
    /** À poser sur la ScrollView : mesure la hauteur visible. */
    onLayout: (event: LayoutChangeEvent) => void;
    /** Hauteur mini du contenu (contentContainerStyle) garantissant `reach`. */
    minContentHeight: number | undefined;
} {
    const [viewport, setViewport] = useState(0);
    const scrollRef = useAnimatedRef<TScroll>();
    // Branché une fois la liste mesurée (donc montée) : les écrans rendent un
    // squelette pendant le chargement, et une ref encore vide au premier
    // passage fait avertir Reanimated (« animatedRef is not initialized »)
    const offset = useScrollOffset(viewport > 0 ? scrollRef : null);
    const progress = useDerivedValue(() =>
        Math.min(1, Math.max(0, (offset.value - start) / distance)),
    );
    return {
        progress,
        offset,
        scrollRef,
        onLayout: (event) => setViewport(event.nativeEvent.layout.height),
        minContentHeight: viewport > 0 ? viewport + reach : undefined,
    };
}
