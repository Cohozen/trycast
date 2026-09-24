import { BlurView } from 'expo-blur';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode, RefObject } from 'react';
import { StyleSheet, type View as RNView } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { useThemeColor, View } from '@/tw';

type GlassHeaderProps = {
    /** Progression du repli (`useCollapseProgress`), de 0 (déplié) à 1 (replié). */
    progress: SharedValue<number>;
    /** `BlurTargetView` qui enveloppe le contenu défilant : seul Android s'en sert. */
    blurTarget: RefObject<RNView | null>;
    /**
     * Contenu épinglé sous la barre native, dans le même verre (identité et
     * onglets du détail Ligue, du profil public). Le contenu défilant doit
     * réserver sa hauteur.
     */
    children?: ReactNode;
    /** Défilement brut (`useCollapseProgress().offset`), avec `collapseHeight`. */
    offset?: SharedValue<number>;
    /**
     * Hauteur du haut de `children` qui glisse sous la barre au défilement,
     * au pixel près : le bas (les onglets) reste alors collé à la liste, puis
     * s'arrête sous la barre.
     */
    collapseHeight?: number;
};

/**
 * Fond en verre sous la barre native transparente (`headerTransparent`) d'un
 * écran à header repliable (DS 2026-09-24) : le contenu défile dessous, flouté,
 * et le voile `bg` passe de 100 % à 76 % d'opacité à mesure que le header se
 * replie. Pas de filet : la bordure du bas a disparu du DS.
 *
 * Le repli du contenu épinglé ne passe QUE par des translations, jamais par
 * une hauteur animée : une propriété de mise en page recalculée à chaque
 * image prend du retard sur le défilement natif sous Android (« saut » quand
 * les onglets se collent). Hauteurs constantes, fond et contenu glissent d'un
 * bloc ; la zone libérée laisse passer les touchers vers la liste.
 *
 * À rendre APRÈS le contenu (sinon le flou ne suit pas une liste dynamique,
 * limite connue d'expo-blur), en frère du `BlurTargetView` : sur Android, le
 * flou ne lit que sa cible, qui ne doit pas la contenir.
 */
export function GlassHeader({
    progress,
    blurTarget,
    children,
    offset,
    collapseHeight = 0,
}: GlassHeaderProps) {
    const headerHeight = useHeaderHeight();
    const bgColor = useThemeColor('bg');
    const veil = useAnimatedStyle(() => ({ opacity: 1 - 0.24 * progress.value }));
    const slide = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: offset ? -Math.min(collapseHeight, Math.max(0, offset.value)) : 0,
            },
        ],
    }));
    return (
        <View className="absolute left-0 right-0 top-0" pointerEvents="box-none">
            {/* Le fond remonte avec le contenu : son haut sort de l'écran, son
                bas suit les onglets */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, slide]}>
                <BlurView
                    blurMethod="dimezisBlurViewSdk31Plus"
                    blurTarget={blurTarget}
                    intensity={40}
                    style={StyleSheet.absoluteFill}
                />
                <Animated.View
                    style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }, veil]}
                />
            </Animated.View>
            <View pointerEvents="none" style={{ height: headerHeight }} />
            {children ? (
                // Rogne ce qui glisse sous la barre
                <View className="overflow-hidden" pointerEvents="box-none">
                    <Animated.View pointerEvents="box-none" style={slide}>
                        {children}
                    </Animated.View>
                </View>
            ) : null}
        </View>
    );
}
