import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { useThemeColor } from '@/tw';

/**
 * Filet sous la barre native d'un écran à header repliable : il apparaît en
 * fondu avec la progression (les options natives n'animent pas
 * `headerShadowVisible`). À poser en premier enfant, hors du scroll.
 */
export function HeaderHairline({ progress }: { progress: SharedValue<number> }) {
    const borderColor = useThemeColor('border');
    const style = useAnimatedStyle(() => ({ opacity: progress.value > 0.02 ? progress.value : 0 }));
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    zIndex: 10,
                    backgroundColor: borderColor,
                },
                style,
            ]}
        />
    );
}
