import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { JokerCardState } from '@/features/jokers/types';
import { Pressable, Text } from '@/tw';
import { cn } from '@/tw/variants';

type JokerChipProps = {
    state: Exclude<JokerCardState, 'none'>;
    onPress: () => void;
    /** Pas encore de prono enregistré : la RPC refuserait, le bouton attend. */
    disabled?: boolean;
};

/**
 * Bouton ×2 de la barre de statut d'une carte prono (maquette « Point
 * double ») : plein vert quand le joker de la phase est posé ici, contour
 * vert quand il est libre, discret quand il est posé ailleurs (le toucher
 * l'y déplace) ou consommé (inerte). Le vert marque est l'identité du
 * joker ; le grenat reste à l'issue choisie.
 */
export function JokerChip({ state, onPress, disabled = false }: JokerChipProps) {
    const { t } = useTranslation('jokers');
    const [pressed, setPressed] = useState(false);
    const inert = disabled || state === 'spent';

    const labels = {
        on: t('chip.on'),
        available: t('chip.available'),
        movable: t('chip.movable'),
        spent: t('chip.spent'),
    } as const;

    return (
        <Pressable
            accessibilityHint={labels[state]}
            accessibilityLabel={t('chip.label')}
            accessibilityRole="switch"
            accessibilityState={{ checked: state === 'on', disabled: inert }}
            className={cn(
                // will-change-variable : cf. button.tsx. Échelle en littéral : scale-95
                // compile en « 95% », refusé par RN (Render Error au press)
                'will-change-variable h-[26px] min-w-[34px] items-center justify-center rounded-pill border-[1.5px] px-2',
                state === 'on' && 'border-brand bg-brand',
                state === 'available' && 'border-brand/60 bg-transparent',
                (state === 'movable' || state === 'spent') && 'border-border bg-transparent',
                pressed && !inert && 'scale-[0.94]',
                disabled && 'opacity-45',
            )}
            disabled={inert}
            hitSlop={6}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            <Text
                className={cn(
                    'font-display text-[14px] leading-[17px] tracking-[0.28px]',
                    state === 'on' && 'text-on-brand',
                    state === 'available' && 'text-brand',
                    (state === 'movable' || state === 'spent') && 'text-text-faint',
                )}>
                ×2
            </Text>
        </Pressable>
    );
}
