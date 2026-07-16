import { useState } from 'react';

import { ActivityIndicator, Pressable, Text, useThemeColor } from '@/tw';
import type { ThemeColorToken } from '@/tw';
import { cn } from '@/tw/variants';

type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    /** Icône optionnelle rendue avant le libellé */
    leadingIcon?: React.ReactNode;
};

const sizeClasses: Record<ButtonSize, { box: string; text: string }> = {
    sm: { box: 'h-9 min-w-9 gap-1.5 px-3.5', text: 'text-[13px]' },
    md: { box: 'h-12 min-w-12 gap-2 px-5', text: 'text-[15px]' },
    lg: { box: 'h-14 min-w-14 gap-2.5 px-[26px]', text: 'text-[16px]' },
};

const variantClasses: Record<
    ButtonVariant,
    { box: string; boxPressed: string; text: string; spinner: ThemeColorToken }
> = {
    primary: {
        box: 'bg-accent tc-glow-accent',
        boxPressed: 'bg-accent-press',
        text: 'text-on-accent',
        spinner: 'on-accent',
    },
    // Vert marque en fond : réservé aux actions « d'invitation » des maquettes
    // ligues (Copier le code) — pas un second CTA accent.
    brand: {
        box: 'bg-brand',
        boxPressed: 'bg-brand/85',
        text: 'text-on-brand',
        spinner: 'on-brand',
    },
    secondary: {
        box: 'border-[1.5px] border-border-strong bg-transparent',
        boxPressed: 'bg-text/10',
        text: 'text-text',
        spinner: 'text',
    },
    ghost: {
        box: 'bg-transparent',
        boxPressed: 'bg-text/10',
        text: 'text-text',
        spinner: 'text',
    },
    danger: {
        box: 'bg-danger',
        boxPressed: 'bg-danger-press',
        text: 'text-on-danger',
        spinner: 'on-danger',
    },
    'danger-outline': {
        box: 'border-[1.5px] border-danger bg-transparent',
        boxPressed: 'bg-danger/10',
        text: 'text-danger',
        spinner: 'danger',
    },
};

/**
 * Bouton pill du design system. Le press rétrécit (scale 0.97) et fonce
 * l'accent, conformément au DS (« press states shrink »).
 */
export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leadingIcon,
}: ButtonProps) {
    const [pressed, setPressed] = useState(false);
    const isDisabled = disabled || loading;
    const s = sizeClasses[size];
    const v = variantClasses[variant];
    const spinnerColor = useThemeColor(v.spinner);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            className={cn(
                // will-change-variable : le press ajoute des classes à variables CSS
                // (--tw-scale-*, --tw-shadow) ; sans ce hint react-native-css
                // remonterait le composant au premier press
                'will-change-variable flex-row items-center justify-center rounded-pill',
                s.box,
                v.box,
                pressed && !isDisabled && cn(v.boxPressed, 'scale-[0.97] shadow-none'),
                isDisabled && 'opacity-45',
                fullWidth && 'w-full',
            )}
            disabled={isDisabled}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            {loading ? (
                <ActivityIndicator color={spinnerColor} />
            ) : (
                <>
                    {leadingIcon}
                    <Text className={cn('font-body-semibold', s.text, v.text)}>{title}</Text>
                </>
            )}
        </Pressable>
    );
}
