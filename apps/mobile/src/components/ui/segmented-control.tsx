import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, type LayoutRectangle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

/** Glissé smooth, sans rebond (ease-out par défaut de withTiming). */
const SLIDE = { duration: 220 } as const;

type SegmentedOption<V extends string> = { value: V; label: string };

type SegmentedControlProps<V extends string> = {
    options: readonly SegmentedOption<V>[];
    value: V;
    onChange: (value: V) => void;
    size?: 'sm' | 'md';
};

/**
 * Contrôle segmenté du design system (bascule Ligues/Général, thème…).
 * Le segment actif est une pastille surface UNIQUE qui coulisse (Reanimated,
 * withTiming sans rebond) vers le segment sélectionné — géométrie mesurée par
 * onLayout. Le libellé actif fond vers `text-text` par cross-fade d'opacité
 * (deux couches empilées, robuste natif + web). Respecte « réduire les
 * animations » (bascule instantanée) et se pose sans glissé au premier rendu.
 */
export function SegmentedControl<V extends string>({
    options,
    value,
    onChange,
    size = 'md',
}: SegmentedControlProps<V>) {
    const activeIndex = Math.max(
        0,
        options.findIndex((o) => o.value === value),
    );

    // Géométrie mesurée de chaque segment : la pastille se cale dessus plutôt
    // que sur une arithmétique gap/padding fragile.
    const [frames, setFrames] = useState<Record<number, LayoutRectangle>>({});
    const onMeasure = useCallback((index: number, frame: LayoutRectangle) => {
        setFrames((prev) => {
            const cur = prev[index];
            if (
                cur &&
                cur.x === frame.x &&
                cur.y === frame.y &&
                cur.width === frame.width &&
                cur.height === frame.height
            ) {
                return prev;
            }
            return { ...prev, [index]: frame };
        });
    }, []);

    return (
        <View
            className={cn(
                'flex-row gap-0.5 rounded-pill bg-surface-sunken p-0.75',
                size === 'sm' ? 'h-8.5' : 'h-14',
            )}>
            <SlidingThumb frames={frames} activeIndex={activeIndex} />
            {options.map((option, index) => (
                <Segment
                    active={option.value === value}
                    index={index}
                    key={option.value}
                    label={option.label}
                    onMeasure={onMeasure}
                    onPress={() => onChange(option.value)}
                    size={size}
                />
            ))}
        </View>
    );
}

/** Pastille unique qui coulisse derrière le segment actif. */
function SlidingThumb({
    frames,
    activeIndex,
}: {
    frames: Record<number, LayoutRectangle>;
    activeIndex: number;
}) {
    const reduce = useReducedMotion();

    const x = useSharedValue(0);
    const w = useSharedValue(0);
    const y = useSharedValue(0);
    const h = useSharedValue(0);
    const ready = useSharedValue(0);
    // Premier placement : se poser sur le segment initial sans glissé.
    const firstPlacement = useRef(true);

    useEffect(() => {
        const frame = frames[activeIndex];
        if (!frame) return;
        const instant = firstPlacement.current || reduce;
        x.value = instant ? frame.x : withTiming(frame.x, SLIDE);
        w.value = instant ? frame.width : withTiming(frame.width, SLIDE);
        // y/height identiques d'un segment à l'autre : pas d'animation nécessaire.
        y.value = frame.y;
        h.value = frame.height;
        ready.value = 1;
        firstPlacement.current = false;
    }, [frames, activeIndex, reduce, x, w, y, h, ready]);

    const style = useAnimatedStyle(() => ({
        opacity: ready.value,
        width: w.value,
        height: h.value,
        transform: [{ translateX: x.value }, { translateY: y.value }],
    }));

    return (
        <Animated.View pointerEvents="none" style={[styles.thumb, style]}>
            <View className="flex-1 rounded-pill bg-surface tc-shadow-sm" />
        </Animated.View>
    );
}

function Segment({
    active,
    index,
    label,
    size,
    onMeasure,
    onPress,
}: {
    active: boolean;
    index: number;
    label: string;
    size: 'sm' | 'md';
    onMeasure: (index: number, frame: LayoutRectangle) => void;
    onPress: () => void;
}) {
    const reduce = useReducedMotion();

    // Progression 0 (inactif) → 1 (actif) : pilote le fondu du libellé.
    const progress = useSharedValue(active ? 1 : 0);
    useEffect(() => {
        const target = active ? 1 : 0;
        progress.value = reduce ? target : withTiming(target, SLIDE);
    }, [active, reduce, progress]);
    const activeLayer = useAnimatedStyle(() => ({ opacity: progress.value }));

    const textClass = cn('font-body-semibold', size === 'sm' ? 'text-[12px]' : 'text-[13px]');

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center justify-center"
            onLayout={(e) => onMeasure(index, e.nativeEvent.layout)}
            onPress={onPress}>
            {/* Couche de base : libellé inactif (grisé) */}
            <Text className={cn(textClass, 'text-text-faint')}>{label}</Text>
            {/* Couche active, fondue par-dessus selon la progression */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, activeLayer]}>
                <View className="flex-1 items-center justify-center">
                    <Text className={cn(textClass, 'text-text')}>{label}</Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    thumb: { position: 'absolute', left: 0, top: 0 },
});
