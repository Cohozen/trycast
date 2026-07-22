import { Fragment, useRef, useState } from 'react';
import {
    type TextInputProps as RNTextInputProps,
    TextInput as RNTextInput,
    StyleSheet,
} from 'react-native';

import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type CodeInputProps = Omit<
    RNTextInputProps,
    // `onChange` natif écarté : ici il porte la valeur, pas un événement
    'caretHidden' | 'maxLength' | 'onChange' | 'onChangeText' | 'ref' | 'style' | 'value'
> & {
    /** Valeur déjà normalisée (0 à `length` caractères). */
    value: string;
    onChange: (value: string) => void;
    /** Nombre de cases. */
    length: number;
    /** Découpe visuelle : `[4, 4]` rend deux groupes de 4 séparés par un tiret. */
    groups?: number[];
    /** Normalisation de chaque frappe (casse, alphabet). Par défaut : inchangée. */
    sanitize?: (raw: string) => string;
    /** Peint les cases en erreur (code refusé par le serveur). */
    error?: boolean;
};

/**
 * Saisie d'un code en cases séparées : un TextInput invisible porte le clavier
 * et le focus, les cases ne font que refléter sa valeur — la case active est
 * cerclée accent, l'erreur peint tout en danger.
 *
 * `accessibilityLabel` arrive déjà traduit de l'appelant : cette primitive ne
 * connaît aucun namespace i18n, c'est ce qui la rend partageable entre domaines.
 */
export function CodeInput({
    value,
    onChange,
    length,
    groups,
    sanitize,
    error = false,
    accessibilityLabel,
    onBlur,
    onFocus,
    ...inputProps
}: CodeInputProps) {
    const inputRef = useRef<RNTextInput>(null);
    const [focused, setFocused] = useState(false);

    const activeIndex = focused && !error && value.length < length ? value.length : -1;

    // Indices de chaque groupe : [[0,1,2,3], [4,5,6,7]] pour `groups={[4, 4]}`
    let cursor = 0;
    const segments = (groups ?? [length]).map((size) =>
        Array.from({ length: size }, () => cursor++),
    );

    const box = (index: number) => {
        const char = value[index] ?? '';
        const active = index === activeIndex;
        return (
            <View
                className={cn(
                    'h-[52px] w-[33px] items-center justify-center rounded-sm border-[1.5px] bg-surface',
                    error
                        ? 'border-danger bg-danger/5'
                        : active
                          ? 'border-accent'
                          : char
                            ? 'border-border-strong'
                            : 'border-border',
                )}
                key={index}>
                <Text className="font-display text-[26px] leading-[28px] text-text">{char}</Text>
            </View>
        );
    };

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            onPress={() => inputRef.current?.focus()}>
            <View className="flex-row items-center justify-center gap-2">
                {segments.map((indexes, group) => (
                    <Fragment key={indexes[0]}>
                        {group > 0 ? (
                            <View className="h-0.5 w-3 rounded-pill bg-border-strong" />
                        ) : null}
                        <View className="flex-row gap-[7px]">{indexes.map(box)}</View>
                    </Fragment>
                ))}
            </View>
            {/* TextInput RN brut : le wrapper @/tw ne relaie pas les refs (focus) */}
            <RNTextInput
                caretHidden
                onBlur={(event) => {
                    setFocused(false);
                    onBlur?.(event);
                }}
                onChangeText={(raw) => onChange((sanitize?.(raw) ?? raw).slice(0, length))}
                onFocus={(event) => {
                    setFocused(true);
                    onFocus?.(event);
                }}
                ref={inputRef}
                style={[StyleSheet.absoluteFill, styles.hiddenInput]}
                value={value}
                {...inputProps}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // Invisible mais focusable : porte le clavier des cases
    hiddenInput: { opacity: 0 },
});
