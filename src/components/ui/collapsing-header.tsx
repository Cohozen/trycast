import { ChevronLeft } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    type SharedValue,
    useAnimatedStyle,
    useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { useThemeColor, View } from '@/tw';

/** Hauteur de la barre une fois l'en-tête replié (sous la zone système). */
const BAR_HEIGHT = 52;

type CollapsingHeaderProps = {
    /** Offset de scroll de l'écran, en px (0 = haut de page). */
    scrollY: SharedValue<number>;
    /**
     * Contenu déplié (hero). Doit rester **non interactif** : il est posé
     * au-dessus du scroll et rendu `pointerEvents="none"` pour que le geste de
     * défilement passe au travers.
     */
    expanded: ReactNode;
    /** Titre condensé, révélé en fondu une fois replié. */
    compactTitle: ReactNode;
    /**
     * Hauteur dépliée mesurée, remontée à l'écran : c'est le padding haut que
     * le contenu défilant doit s'appliquer pour démarrer sous l'en-tête.
     */
    onHeightChange: (height: number) => void;
    /** Retour arrière (l'écran gère le repli quand il n'y a pas de pile). */
    onBack: () => void;
};

/**
 * En-tête repliable des pages de détail (match, ligue) : le hero rétrécit au
 * scroll jusqu'à une barre compacte qui garde le bouton retour et un titre
 * condensé. Remplace le header natif, retiré de ces routes.
 *
 * La hauteur dépliée est **mesurée** (`onLayout`) et non codée en dur : elle
 * diffère nettement entre le hero d'un match et l'identité d'une ligue, et une
 * constante fausse produirait un saut au premier scroll. Tant que la mesure
 * n'est pas faite, la hauteur reste `auto` — le premier rendu est donc déjà à
 * la bonne taille, sans à-coup.
 */
export function CollapsingHeader({
    scrollY,
    expanded,
    compactTitle,
    onHeightChange,
    onBack,
}: CollapsingHeaderProps) {
    const { t } = useTranslation(['common']);
    const insets = useSafeAreaInsets();
    const textColor = useThemeColor('text');
    // Le repli suit le doigt (manipulation directe, pas une animation qui se
    // joue toute seule) : on le garde, mais on retire le parallaxe décoratif.
    const reducedMotion = useReducedMotion();

    const [heroHeight, setHeroHeight] = useState(0);

    const collapsedHeight = insets.top + BAR_HEIGHT;
    const expandedHeight = collapsedHeight + heroHeight;
    const measured = heroHeight > 0;
    // Garde-fou : jamais de division par zéro avant la première mesure.
    const range = Math.max(expandedHeight - collapsedHeight, 1);

    const containerStyle = useAnimatedStyle(() => {
        if (!measured) return {};
        return {
            height: interpolate(
                scrollY.value,
                [0, range],
                [expandedHeight, collapsedHeight],
                Extrapolation.CLAMP,
            ),
        };
    });

    const heroStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [0, range * 0.6], [1, 0], Extrapolation.CLAMP),
        transform: [
            {
                translateY: reducedMotion
                    ? 0
                    : interpolate(
                          scrollY.value,
                          [0, range],
                          [0, -range * 0.3],
                          Extrapolation.CLAMP,
                      ),
            },
        ],
    }));

    const compactStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [range * 0.5, range], [0, 1], Extrapolation.CLAMP),
    }));

    // Séparateur révélé une fois replié — cross-fade d'opacité et jamais
    // interpolateColor : avec useThemeColor ce dernier reçoit une var() CSS
    // non interpolable sur web.
    const hairlineStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [range * 0.5, range], [0, 1], Extrapolation.CLAMP),
    }));

    return (
        // Pas de className sur Animated.View (non interopéré par
        // react-native-css) : géométrie en style, tokens sur les View enfants.
        // box-none : seuls les enfants interactifs (le bouton retour) captent,
        // le reste du geste va au ScrollView qui défile dessous.
        <Animated.View pointerEvents="box-none" style={[styles.container, containerStyle]}>
            {/* Fond opaque en permanence : le contenu qui défile dessous ne
                doit jamais transparaître derrière la barre ni le hero. */}
            <View className="absolute bottom-0 left-0 right-0 top-0 bg-bg" pointerEvents="none" />
            {/* Séparateur : seulement une fois replié, contre le contenu */}
            <Animated.View pointerEvents="none" style={[styles.hairline, hairlineStyle]}>
                <View className="h-full w-full bg-border" />
            </Animated.View>

            {/* Barre : le bouton retour reste accessible tout du long */}
            <View
                className="w-full max-w-[800px] flex-row items-center gap-1 self-center px-3"
                style={{ height: BAR_HEIGHT, marginTop: insets.top }}>
                <IconButton accessibilityLabel={t('common:actions.back')} onPress={onBack}>
                    <ChevronLeft color={textColor} size={24} strokeWidth={2} />
                </IconButton>
                <Animated.View pointerEvents="none" style={[styles.compact, compactStyle]}>
                    {compactTitle}
                </Animated.View>
            </View>

            {/* Hero : purement présentationnel, transparent aux gestes */}
            <Animated.View pointerEvents="none" style={heroStyle}>
                <View
                    className="w-full max-w-[800px] self-center px-5"
                    onLayout={(event) => {
                        const height = event.nativeEvent.layout.height;
                        if (height <= 0 || height === heroHeight) return;
                        setHeroHeight(height);
                        onHeightChange(insets.top + BAR_HEIGHT + height);
                    }}>
                    {expanded}
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: 'hidden',
    },
    compact: { flex: 1, minWidth: 0 },
    hairline: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: StyleSheet.hairlineWidth,
    },
});
