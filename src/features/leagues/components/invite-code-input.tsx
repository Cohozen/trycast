import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput as RNTextInput, StyleSheet } from 'react-native';

import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type InviteCodeInputProps = {
    /** Code déjà filtré (0 à 8 caractères de l'alphabet du serveur). */
    value: string;
    onChange: (value: string) => void;
    /** Peint les cases en erreur (code inconnu côté serveur). */
    error?: boolean;
};

// Alphabet du check invite_code (pas de 0/O/1/I/L) — miroir de
// normalizeInviteCode ; on filtre à la saisie, la validation reste serveur.
const FORBIDDEN = /[^A-HJ-KM-NP-Z2-9]/g;

export function sanitizeInviteCodeInput(raw: string): string {
    return raw.toUpperCase().replaceAll(FORBIDDEN, '').slice(0, 8);
}

/**
 * Saisie du code d'invitation en 8 cases (2 groupes de 4, maquette
 * Rejoindre) : un TextInput invisible porte le clavier et le focus, les cases
 * ne font que refléter sa valeur — la case active est cerclée accent, l'erreur
 * peint tout en danger.
 */
export function InviteCodeInput({ value, onChange, error = false }: InviteCodeInputProps) {
    const { t } = useTranslation(['leagues']);
    const inputRef = useRef<RNTextInput>(null);
    const [focused, setFocused] = useState(false);

    const activeIndex = focused && !error && value.length < 8 ? value.length : -1;

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
            accessibilityLabel={t('leagues:join.codeLabel')}
            onPress={() => inputRef.current?.focus()}>
            <View className="flex-row items-center justify-center gap-2">
                <View className="flex-row gap-[7px]">{[0, 1, 2, 3].map(box)}</View>
                <View className="h-0.5 w-3 rounded-pill bg-border-strong" />
                <View className="flex-row gap-[7px]">{[4, 5, 6, 7].map(box)}</View>
            </View>
            {/* TextInput RN brut : le wrapper @/tw ne relaie pas les refs (focus) */}
            <RNTextInput
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                caretHidden
                onBlur={() => setFocused(false)}
                onChangeText={(raw) => onChange(sanitizeInviteCodeInput(raw))}
                onFocus={() => setFocused(true)}
                ref={inputRef}
                style={[StyleSheet.absoluteFill, styles.hiddenInput]}
                value={value}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // Invisible mais focusable : porte le clavier des 8 cases
    hiddenInput: { opacity: 0 },
});
