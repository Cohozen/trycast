import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
    scrollTo,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedRef,
    useAnimatedStyle,
    useDerivedValue,
} from 'react-native-reanimated';

import { DayStripPill } from '@/features/matches/components/day-strip-pill';
import type { StripDay } from '@/features/matches/day-range';
import { i18n } from '@/lib/i18n';
import { useThemeColor } from '@/tw';

type DayStripProps = {
    days: StripDay[];
    /** Décalage horizontal (px) du carrousel Résultats. */
    scrollX: SharedValue<number>;
    /** Largeur d'une page du carrousel (= largeur d'écran). */
    pageWidth: number;
    /** Tap sur une pilule : index du jour visé. */
    onSelect: (index: number) => void;
};

// Espace entre pilules (inline, exact) et marge de bord du conteneur. La largeur
// d'une pilule (et donc le pas) est mesurée au rendu, pas devinée : `w-12` ne
// vaut pas 48 dans ce projet, et une valeur en dur fait dériver l'indicateur.
const ITEM_GAP = 10;
const EDGE_PADDING = 16;

/**
 * Bande de sélection de jour liée au carrousel Résultats : un indicateur grenat
 * glisse en continu au rythme du défilement (index fractionnaire = scrollX /
 * largeur de page), une fenêtre clippée révèle le duplicata blanc des pilules
 * sous l'indicateur, et la bande se recentre sur le jour courant. Le tout suit
 * le doigt image par image, sans re-render JS.
 */
export function DayStrip({ days, scrollX, pageWidth, onSelect }: DayStripProps) {
    const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    const stripRef = useAnimatedRef<Animated.ScrollView>();
    const borderColor = useThemeColor('border');
    const accentColor = useThemeColor('accent');
    // Géométrie réelle de la première pilule (mesurée au rendu) : origine, pas,
    // largeur et hauteur de l'indicateur en découlent.
    const [pill, setPill] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const step = pill.width + ITEM_GAP;

    const fracIndex = useDerivedValue(() => (pageWidth > 0 ? scrollX.value / pageWidth : 0));

    // Décalage max précalculé en JS : le worklet ne capture que des nombres
    // (sérialiser `days`, qui contient des Date, casse le worklet).
    const contentWidth = 2 * EDGE_PADDING + days.length * pill.width + (days.length - 1) * ITEM_GAP;
    const maxOffset = Math.max(0, contentWidth - pageWidth);

    // Recentrage continu : garde le jour courant au milieu de la bande.
    useAnimatedReaction(
        () => fracIndex.value,
        (frac) => {
            const itemStart = pill.x + frac * step;
            const centered = itemStart - (pageWidth - pill.width) / 2;
            scrollTo(stripRef, Math.min(maxOffset, Math.max(0, centered)), 0, false);
        },
    );

    // Indicateur grenat et fenêtre de révélation partagent la même position.
    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pill.x + fracIndex.value * step }],
    }));
    // Le duplicata contre-défile pour que la pilule visée s'aligne sur la base.
    const revealInnerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -(fracIndex.value * step) }],
    }));

    const measureFirstPill = (event: LayoutChangeEvent) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        setPill((prev) =>
            prev.x === x && prev.y === y && prev.width === width && prev.height === height
                ? prev
                : { x, y, width, height },
        );
    };

    return (
        <Animated.ScrollView
            contentContainerStyle={{
                flexDirection: 'row',
                gap: ITEM_GAP,
                paddingHorizontal: EDGE_PADDING,
                paddingTop: 4,
                paddingBottom: 10,
            }}
            horizontal
            ref={stripRef}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={{
                flexGrow: 0,
                borderBottomWidth: 1,
                borderBottomColor: borderColor,
            }}>
            {/* Indicateur grenat mobile (sous les pilules). Styles en inline :
                NativeWind (className) ne s'applique pas à un Animated.View. */}
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        left: 0,
                        top: pill.y,
                        width: pill.width,
                        height: pill.height,
                        borderRadius: 999,
                        backgroundColor: accentColor,
                        shadowColor: accentColor,
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 6,
                    },
                    slideStyle,
                ]}
            />

            {/* Couche de base : pilules estompées, tapables, mesurées */}
            {days.map((day, index) => (
                <DayStripPill
                    dayNumber={day.date.getDate()}
                    isToday={day.isToday}
                    key={day.key}
                    onLayout={index === 0 ? measureFirstPill : undefined}
                    onPress={() => onSelect(index)}
                    variant="idle"
                    weekday={weekdayFormatter.format(day.date).replace('.', '')}
                />
            ))}

            {/* Fenêtre de révélation : duplicata blanc clippé à une pilule */}
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        left: 0,
                        top: pill.y,
                        width: pill.width,
                        height: pill.height,
                        overflow: 'hidden',
                    },
                    slideStyle,
                ]}>
                <Animated.View style={[{ flexDirection: 'row', gap: ITEM_GAP }, revealInnerStyle]}>
                    {days.map((day) => (
                        <DayStripPill
                            dayNumber={day.date.getDate()}
                            isToday={day.isToday}
                            key={day.key}
                            variant="active"
                            weekday={weekdayFormatter.format(day.date).replace('.', '')}
                        />
                    ))}
                </Animated.View>
            </Animated.View>
        </Animated.ScrollView>
    );
}
