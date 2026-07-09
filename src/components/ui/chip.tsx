import { useState } from 'react';

import { Pressable, Text } from '@/tw';
import { cn } from '@/tw/variants';

type ChipProps = {
    label: string;
    onPress: () => void;
    selected?: boolean;
    disabled?: boolean;
    /** Icône optionnelle rendue avant le libellé */
    leadingIcon?: React.ReactNode;
};

/**
 * Chip pill sélectionnable (filtres, sélecteur de ligue…). La sélection
 * passe en grenat plein — l'étincelle marque le choix actif.
 */
export function Chip({
    label,
    onPress,
    selected = false,
    disabled = false,
    leadingIcon,
}: ChipProps) {
    const [pressed, setPressed] = useState(false);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            className={cn(
                'h-[34px] flex-row items-center gap-1.5 rounded-pill px-3.5',
                selected
                    ? 'border-[1.5px] border-transparent bg-accent'
                    : 'border-[1.5px] border-border-strong bg-transparent',
                pressed && !disabled && 'scale-95',
                disabled && 'opacity-45',
            )}
            disabled={disabled}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            {leadingIcon}
            <Text
                className={cn(
                    'font-body-semibold text-[13px]',
                    selected ? 'text-on-accent' : 'text-text',
                )}>
                {label}
            </Text>
        </Pressable>
    );
}
