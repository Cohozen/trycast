import { useEffect } from 'react';
import Animated, {
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { View } from '@/tw';

/**
 * Point pulsant du direct (même boucle d'opacité que le skeleton), partagé
 * par le chip de statut, la section « En cours » de l'accueil et les cartes
 * de Résultats. Immobile si l'utilisateur réduit les animations.
 */
export function LiveDot() {
    const reducedMotion = useReducedMotion();
    const opacity = useSharedValue(1);

    useEffect(() => {
        if (reducedMotion) return;
        opacity.value = withRepeat(withTiming(0.35, { duration: 700 }), -1, true);
    }, [opacity, reducedMotion]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View style={animatedStyle}>
            <View className="h-1.5 w-1.5 rounded-pill bg-accent" />
        </Animated.View>
    );
}
