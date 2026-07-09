import type { StripDay } from '@/features/matches/day-range';
import { i18n } from '@/lib/i18n';
import { Pressable, ScrollView, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type DayStripProps = {
    days: StripDay[];
    selected: string;
    onSelect: (key: string) => void;
};

/**
 * Bande horizontale de sélection de jour (maquette Résultats) : pilules
 * jour/numéro sur la plage continue de la compétition — sélection grenat
 * avec glow, aujourd'hui cerclé, jours sans match estompés et inertes.
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
