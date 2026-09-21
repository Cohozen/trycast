import { useState } from 'react';

import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type ChipProps = {
    label: string;
    onPress: () => void;
    selected?: boolean;
    disabled?: boolean;
    /** Icône optionnelle rendue avant le libellé */
    leadingIcon?: React.ReactNode;
    /**
     * Point de 6 px avant le libellé (ex. compétition en cours) : grenat au
     * repos, on-accent atténué sur la puce sélectionnée.
     */
    dot?: boolean;
    /** Libellé d'accessibilité, si le libellé visible ne suffit pas. */
    accessibilityLabel?: string;
};

/**
 * Chip pill sélectionnable (filtres, sélecteur de compétition du Profil —
 * DS 2026-09-21). Au repos : surface neutre, texte atténué ; la sélection
 * passe en grenat plein — l'étincelle marque le choix actif.
 */
export function Chip({
    label,
    onPress,
    selected = false,
    disabled = false,
    leadingIcon,
    dot = false,
    accessibilityLabel,
}: ChipProps) {
    const [pressed, setPressed] = useState(false);

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            className={cn(
                // will-change-variable : cf. button.tsx. Échelle en littéral : scale-95
                // compile en « 95% », refusé par RN (Render Error au press)
                'will-change-variable h-9 flex-row items-center gap-[7px] rounded-pill border px-3.5',
                selected ? 'border-accent bg-accent' : 'border-border bg-surface',
                pressed && !disabled && 'scale-[0.95]',
                disabled && 'opacity-45',
            )}
            disabled={disabled}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            {leadingIcon}
            {dot ? (
                <View
                    className={cn(
                        'h-1.5 w-1.5 rounded-pill',
                        selected ? 'bg-on-accent/75' : 'bg-accent',
                    )}
                />
            ) : null}
            <Text
                className={cn(
                    'text-[13px] tracking-[0.13px]',
                    selected
                        ? 'font-body-bold text-on-accent'
                        : 'font-body-semibold text-text-muted',
                )}>
                {label}
            </Text>
        </Pressable>
    );
}
