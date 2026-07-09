import { Pressable, ScrollView, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

import { i18n } from '@/lib/i18n';

export type StripDay = { key: string; date: Date };

type DayStripProps = {
    days: StripDay[];
    selected: string;
    onSelect: (key: string) => void;
};

/**
 * Bande horizontale de sélection de jour (maquette Résultats) : pilules
 * jour/numéro, la sélection porte l'étincelle grenat.
 */
export function DayStrip({ days, selected, onSelect }: DayStripProps) {
    const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });

    return (
        <ScrollView
            className="flex-none border-b border-border"
            contentContainerClassName="gap-2.5 px-4 pb-2.5 pt-1"
            horizontal
            showsHorizontalScrollIndicator={false}>
            {days.map((day) => {
                const active = day.key === selected;
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        className={cn(
                            'w-12 items-center justify-center gap-1.5 rounded-pill py-2.5',
                            active ? 'bg-surface tc-shadow-sm' : 'bg-transparent',
                        )}
                        key={day.key}
                        onPress={() => onSelect(day.key)}>
                        <Text
                            className={cn(
                                'font-body-bold text-[11px] uppercase tracking-[0.88px]',
                                active ? 'text-accent' : 'text-text-faint',
                            )}>
                            {weekdayFormatter.format(day.date).replace('.', '')}
                        </Text>
                        <Text
                            className={cn(
                                'text-[15px]',
                                active
                                    ? 'font-body-bold text-text'
                                    : 'font-body-medium text-text-muted',
                            )}>
                            {day.date.getDate()}
                        </Text>
                        <View
                            className={cn(
                                'h-[5px] w-[5px] rounded-pill',
                                active ? 'bg-accent' : 'bg-border-strong',
                            )}
                        />
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
