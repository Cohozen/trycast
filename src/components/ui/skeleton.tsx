import { useEffect } from 'react';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { View } from '@/tw';
import { cn } from '@/tw/variants';

type SkeletonVariant = 'line' | 'block' | 'circle';

type SkeletonProps = {
    variant?: SkeletonVariant;
    /** Dimensions via className (ex. "h-24 w-full", "h-10 w-10") */
    className?: string;
};

const variantClasses: Record<SkeletonVariant, string> = {
    line: 'h-3 w-full rounded-xs',
    block: 'h-20 w-full rounded-md',
    circle: 'h-10 w-10 rounded-pill',
};

/**
 * Placeholder de chargement du design system. Pulsation d'opacité en guise
 * de shimmer (la seule animation en boucle autorisée avec le pulse live).
 */
export function Skeleton({ variant = 'line', className }: SkeletonProps) {
    const opacity = useSharedValue(1);

    useEffect(() => {
        opacity.value = withRepeat(withTiming(0.45, { duration: 700 }), -1, true);
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View style={animatedStyle}>
            <View className={cn('bg-text/10', variantClasses[variant], className)} />
        </Animated.View>
    );
}
