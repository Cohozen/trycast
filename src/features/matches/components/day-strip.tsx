import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import type { StripDay } from '@/features/matches/day-range';
import { i18n } from '@/lib/i18n';
import { Pressable, ScrollView, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type DayStripProps = {
    days: StripDay[];
    selected: string;
    onSelect: (key: string) => void;
};

// Géométrie des pilules (miroir des classes ci-dessous : w-12, gap-2.5, px-4),
// nécessaire pour positionner la strip sur le jour sélectionné au montage.
const ITEM_WIDTH = 48;
const ITEM_GAP = 10;
const EDGE_PADDING = 16;

/**
 * Bande horizontale de sélection de jour (maquette Résultats) : pilules
 * jour/numéro sur la plage continue de la compétition — sélection grenat
 * avec glow, aujourd'hui cerclé, jours sans match estompés et inertes.
 * Au montage, la strip est positionnée pour centrer le jour sélectionné.
 */
export function DayStrip({ days, selected, onSelect }: DayStripProps) {
    const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    const { width: windowWidth } = useWindowDimensions();

    // Offset figé au montage : centre le jour présélectionné sans re-scroller
    // à chaque sélection manuelle (le doigt garde la main ensuite).
    const [initialOffset] = useState(() => {
        const index = days.findIndex((day) => day.key === selected);
        if (index < 0) return 0;
        const contentWidth =
            2 * EDGE_PADDING + days.length * ITEM_WIDTH + (days.length - 1) * ITEM_GAP;
        const maxOffset = Math.max(0, contentWidth - windowWidth);
        const itemStart = EDGE_PADDING + index * (ITEM_WIDTH + ITEM_GAP);
        const centered = itemStart - (windowWidth - ITEM_WIDTH) / 2;
        return Math.min(maxOffset, Math.max(0, centered));
    });

    return (
        <ScrollView
            className="flex-none border-b border-border"
            contentContainerClassName="gap-2.5 px-4 pb-2.5 pt-1"
            contentOffset={{ x: initialOffset, y: 0 }}
            horizontal
            showsHorizontalScrollIndicator={false}>
            {days.map((day) => {
                const active = day.key === selected;
                const disabled = !day.hasMatches;
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled }}
                        className={cn(
                            'w-12 items-center justify-center gap-1.5 rounded-pill border-[1.5px] border-transparent py-2.5',
                            active && 'bg-accent tc-glow-accent',
                            !active && day.isToday && 'border-border-strong bg-surface',
                            disabled && 'opacity-40',
                        )}
                        disabled={disabled}
                        key={day.key}
                        onPress={() => onSelect(day.key)}>
                        <Text
                            className={cn(
                                'font-body-bold text-[11px] uppercase tracking-[0.88px]',
                                active ? 'text-on-accent/80' : 'text-text-faint',
                            )}>
                            {weekdayFormatter.format(day.date).replace('.', '')}
                        </Text>
                        <Text
                            className={cn(
                                'text-[15px]',
                                active
                                    ? 'font-body-bold text-on-accent'
                                    : 'font-body-medium text-text-muted',
                            )}>
                            {day.date.getDate()}
                        </Text>
                        <View
                            className={cn(
                                'h-[5px] w-[5px] rounded-pill',
                                active
                                    ? 'bg-on-accent'
                                    : day.hasMatches
                                      ? 'bg-accent'
                                      : 'bg-transparent',
                            )}
                        />
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
