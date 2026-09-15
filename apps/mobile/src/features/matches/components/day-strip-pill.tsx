import type { LayoutChangeEvent } from 'react-native';

import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type DayStripPillProps = {
    weekday: string;
    dayNumber: number;
    isToday: boolean;
    /**
     * `idle` = couche de base (texte estompé, tapable) ; `active` = duplicata
     * en blanc, révélé par la fenêtre mobile de la bande. Les deux partagent la
     * même géométrie (largeur w-12) pour se superposer au pixel près.
     */
    variant: 'idle' | 'active';
    onPress?: () => void;
    onLayout?: (event: LayoutChangeEvent) => void;
};

/** Pilule jour/numéro de la bande Résultats (une par jour à matchs). */
export function DayStripPill({
    weekday,
    dayNumber,
    isToday,
    variant,
    onPress,
    onLayout,
}: DayStripPillProps) {
    const active = variant === 'active';
    return (
        <Pressable
            accessibilityRole={active ? undefined : 'button'}
            className={cn(
                'w-12 items-center justify-center gap-1.5 rounded-pill border-[1.5px] border-transparent py-2.5',
                !active && isToday && 'border-border-strong',
            )}
            disabled={active || !onPress}
            onLayout={onLayout}
            onPress={onPress}>
            <Text
                className={cn(
                    'font-body-bold text-[11px] uppercase tracking-[0.88px]',
                    active ? 'text-on-accent' : 'text-text-faint',
                )}>
                {weekday}
            </Text>
            <Text
                className={cn(
                    'text-[15px]',
                    active ? 'font-body-bold text-on-accent' : 'font-body-medium text-text-muted',
                )}>
                {dayNumber}
            </Text>
            <View
                className={cn(
                    'h-[5px] w-[5px] rounded-pill',
                    active ? 'bg-on-accent' : 'bg-accent',
                )}
            />
        </Pressable>
    );
}
