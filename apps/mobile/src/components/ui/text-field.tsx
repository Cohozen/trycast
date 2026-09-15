import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Pressable, Text, TextInput, useThemeColor, View } from '@/tw';
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
 * de saisie dans le DS). Un champ `secureTextEntry` masque sa valeur par
 * défaut et gagne un œil pour la révéler — tous les champs mot de passe en
 * héritent sans rien changer à leur appel.
 */
export function TextField({
    label,
    helper,
    error,
    disabled = false,
    leadingIcon,
    secureTextEntry = false,
    ...inputProps
}: TextFieldProps) {
    const { t } = useTranslation('common');
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const faintColor = useThemeColor('text-faint');

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
                    placeholderTextColor={faintColor}
                    {...inputProps}
                    onBlur={(e) => {
                        setFocused(false);
                        inputProps.onBlur?.(e);
                    }}
                    onFocus={(e) => {
                        setFocused(true);
                        inputProps.onFocus?.(e);
                    }}
                    secureTextEntry={secureTextEntry && !revealed}
                />
                {secureTextEntry ? (
                    <Pressable
                        accessibilityLabel={t(
                            revealed ? 'actions.hidePassword' : 'actions.showPassword',
                        )}
                        accessibilityRole="button"
                        disabled={disabled}
                        hitSlop={10}
                        onPress={() => setRevealed((v) => !v)}>
                        {revealed ? (
                            <EyeOff color={faintColor} size={19} strokeWidth={1.9} />
                        ) : (
                            <Eye color={faintColor} size={19} strokeWidth={1.9} />
                        )}
                    </Pressable>
                ) : null}
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
