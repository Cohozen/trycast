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
     * onglets du détail Ligue). Le contenu défilant doit réserver sa hauteur.
     */
    children?: ReactNode;
};

/**
 * Fond en verre sous la barre native transparente (`headerTransparent`) d'un
 * écran à header repliable (DS 2026-09-24) : le contenu défile dessous, flouté,
 * et le voile `bg` passe de 100 % à 76 % d'opacité à mesure que le header se
 * replie. Pas de filet : la bordure du bas a disparu du DS.
 *
 * À rendre APRÈS le contenu (sinon le flou ne suit pas une liste dynamique,
 * limite connue d'expo-blur), en frère du `BlurTargetView` : sur Android, le
 * flou ne lit que sa cible, qui ne doit pas le contenir.
 */
export function GlassHeader({ progress, blurTarget, children }: GlassHeaderProps) {
    const headerHeight = useHeaderHeight();
    const bgColor = useThemeColor('bg');
    const veil = useAnimatedStyle(() => ({ opacity: 1 - 0.24 * progress.value }));
    return (
        <View className="absolute left-0 right-0 top-0" pointerEvents="box-none">
            <BlurView
                blurMethod="dimezisBlurViewSdk31Plus"
                blurTarget={blurTarget}
                intensity={40}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
            />
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }, veil]}
            />
            <View pointerEvents="none" style={{ height: headerHeight }} />
            {children}
        </View>
    );
}
