import { useState } from 'react';

import { Text, TextInput, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type TextFieldProps = React.ComponentProps<typeof TextInput> & {
    label?: string;
    /** Message d'aide sous le champ (remplacé par l'erreur si les deux sont fournis) */
    helper?: string | null;
    error?: string | null;
    disabled?: boolean;
    /** Icône optionnelle à gauche du champ */
    leadingIcon?: React.ReactNode;
};

/**
 * Champ de saisie du design system : label overline, boîte 48px radius-sm,
 * bordure brand au focus, accent en erreur (le grenat signale aussi l'erreur
 * de saisie dans le DS).
 */
export function TextField({
    label,
    helper,
    error,
    disabled = false,
    leadingIcon,
    ...inputProps
}: TextFieldProps) {
    const [focused, setFocused] = useState(false);
    const placeholderColor = useThemeColor('text-faint');

    return (
        <View className="w-full gap-1.5">
            {label ? (
                <Text className="font-body-semibold text-[13px] text-text-muted">{label}</Text>
            ) : null}
            <View
                className={cn(
                    'h-14 flex-row items-center gap-2 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5',
                    focused && !error && 'border-brand',
                    error && 'border-accent',
                    disabled && 'bg-surface-sunken opacity-60',
                )}>
                {leadingIcon}
                <TextInput
                    className="min-w-0 flex-1 font-body text-[15px] text-text"
                    editable={!disabled}
                    placeholderTextColor={placeholderColor}
                    {...inputProps}
                    onBlur={(e) => {
                        setFocused(false);
                        inputProps.onBlur?.(e);
                    }}
                    onFocus={(e) => {
                        setFocused(true);
                        inputProps.onFocus?.(e);
                    }}
                />
            </View>
            {error || helper ? (
                <Text
                    className={cn(
                        'font-body text-caption',
                        error ? 'text-accent' : 'text-text-faint',
                    )}>
                    {error || helper}
                </Text>
            ) : null}
        </View>
    );
}
