import type { ReactNode } from 'react';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { useThemeColor } from '@/tw';

type CollapsingHeaderTitleProps = {
    /** Titre de l'écran au repos (style du titre natif). */
    title: string;
    /** Version compacte du hero, révélée une fois le header replié. */
    compact: ReactNode;
    /** Progression du repli, 0 → 1 (cf. useCollapseProgress). */
    progress: SharedValue<number>;
    /** Vitesse de sortie du titre : il disparaît à t = 1 / titleFade. */
    titleFade?: number;
    /** Seuil d'entrée du compact (t à partir duquel il apparaît). */
    compactFrom?: number;
};

/**
 * Titre de la barre native d'un écran à header repliable (DS 2026-09-21) :
 * fondu enchaîné entre le titre et un résumé compact du hero. Posé via
 * `headerTitle`, il laisse le retour et le swipe-back système intacts.
 * Styles inline : NativeWind ne s'applique pas aux vues animées.
 */
export function CollapsingHeaderTitle({
    title,
    compact,
    progress,
    titleFade = 1.6,
    compactFrom = 0.35,
}: CollapsingHeaderTitleProps) {
    const textColor = useThemeColor('text');

    const titleStyle = useAnimatedStyle(() => ({
        opacity: 1 - Math.min(1, progress.value * titleFade),
    }));
    const compactStyle = useAnimatedStyle(() => ({
        opacity: Math.max(0, (progress.value - compactFrom) / (1 - compactFrom)),
        transform: [{ translateY: (1 - progress.value) * 7 }],
    }));

    // Le compact est dans le flux (il fixe la largeur du titre natif, mesurée
    // au premier rendu) ; le titre au repos se superpose, centré.
    return (
        <Animated.View style={{ height: 34, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View
                pointerEvents="none"
                style={[
                    { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 240 },
                    compactStyle,
                ]}>
                {compact}
            </Animated.View>
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                    titleStyle,
                ]}>
                <Animated.Text
                    numberOfLines={1}
                    style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: textColor }}>
                    {title}
                </Animated.Text>
            </Animated.View>
        </Animated.View>
    );
}
