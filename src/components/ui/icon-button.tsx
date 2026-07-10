import { useState } from 'react';

import { Pressable } from '@/tw';
import { cn } from '@/tw/variants';

type IconButtonVariant = 'solid' | 'soft' | 'ghost' | 'outline';
type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = {
    /** L'icône à afficher (la couleur du trait reste à la charge de l'appelant) */
    children: React.ReactNode;
    accessibilityLabel: string;
    onPress: () => void;
    variant?: IconButtonVariant;
    size?: IconButtonSize;
    disabled?: boolean;
    /** false pour un carré arrondi (radius-sm) au lieu du rond */
    round?: boolean;
};

const sizeClasses: Record<IconButtonSize, string> = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-13 w-13',
};

const variantClasses: Record<IconButtonVariant, { box: string; boxPressed: string }> = {
    solid: { box: 'bg-accent', boxPressed: 'bg-accent-press' },
    soft: { box: 'bg-text/10', boxPressed: 'bg-text/15' },
    ghost: { box: 'bg-transparent', boxPressed: 'bg-text/10' },
    outline: {
        box: 'border-[1.5px] border-border-strong bg-transparent',
        boxPressed: 'bg-text/10',
    },
};

/** Bouton icône du design system (hit target 44px en md, press scale 0.92). */
export function IconButton({
    children,
    accessibilityLabel,
    onPress,
    variant = 'ghost',
    size = 'md',
    disabled = false,
    round = true,
}: IconButtonProps) {
    const [pressed, setPressed] = useState(false);
    const v = variantClasses[variant];

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            className={cn(
                // will-change-variable : cf. button.tsx (scale-[0.92] au press)
                'will-change-variable items-center justify-center',
                round ? 'rounded-pill' : 'rounded-sm',
                sizeClasses[size],
                v.box,
                pressed && !disabled && cn(v.boxPressed, 'scale-[0.92]'),
                disabled && 'opacity-45',
            )}
            disabled={disabled}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            {children}
        </Pressable>
    );
}
