import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type SegmentedOption<V extends string> = { value: V; label: string };

type SegmentedControlProps<V extends string> = {
    options: readonly SegmentedOption<V>[];
    value: V;
    onChange: (value: V) => void;
    size?: 'sm' | 'md';
};

/**
 * Contrôle segmenté du design system (bascule Ligues/Général, thème…).
 * Le segment actif est une pastille surface posée sur le fond sunken.
 */
export function SegmentedControl<V extends string>({
    options,
    value,
    onChange,
    size = 'md',
}: SegmentedControlProps<V>) {
    return (
        <View
            className={cn(
                'flex-row gap-0.5 rounded-pill bg-surface-sunken p-[3px]',
                size === 'sm' ? 'h-[34px]' : 'h-10',
            )}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        className={cn(
                            'flex-1 items-center justify-center rounded-pill',
                            active && 'bg-surface tc-shadow-sm',
                        )}
                        key={option.value}
                        onPress={() => onChange(option.value)}>
                        <Text
                            className={cn(
                                'font-body-semibold',
                                size === 'sm' ? 'text-[12px]' : 'text-[13px]',
                                active ? 'text-text' : 'text-text-faint',
                            )}>
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
