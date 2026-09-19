import { useState } from 'react';

import { ReactionEmoji } from '@/features/reactions/components/reaction-emoji';
import { Pressable } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionPickerOptionProps = {
    emoji: string;
    /** Libellé déjà traduit (« Réagir : Bravo »). */
    accessibilityLabel: string;
    /** C'est ma réaction actuelle : la retoucher la retire. */
    selected: boolean;
    onPress: () => void;
};

/**
 * Une réaction du popover : cible de 44 pt, emoji de 28 px. Choisie : fond
 * sunken et contour d'encre, comme la puce « ma réaction ». Rétrécit à 0,94
 * pendant l'appui.
 */
export function ReactionPickerOption({
    emoji,
    accessibilityLabel,
    selected,
    onPress,
}: ReactionPickerOptionProps) {
    const [pressed, setPressed] = useState(false);

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="menuitem"
            accessibilityState={{ selected }}
            className={cn(
                // will-change-variable : cf. button.tsx. Échelle en littéral : scale-94
                // compilerait en « 94% », refusé par RN au premier appui
                'will-change-variable h-11 w-11 items-center justify-center rounded-pill border-[1.5px]',
                selected ? 'border-text/40 bg-surface-sunken' : 'border-transparent',
                pressed && 'scale-[0.94]',
            )}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            <ReactionEmoji emoji={emoji} size="picker" />
        </Pressable>
    );
}
