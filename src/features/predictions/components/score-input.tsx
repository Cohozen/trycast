import { TextInput } from '@/tw';
import { cn } from '@/tw/variants';

type ScoreInputProps = {
    value: string;
    onChangeText: (value: string) => void;
    accessibilityLabel: string;
    invalid?: boolean;
};

/**
 * Champ de score du design system : chiffres Anton sur fond sunken, une case
 * par équipe. L'erreur borde en accent (grenat = erreur de saisie dans le DS).
 */
export function ScoreInput({ value, onChangeText, accessibilityLabel, invalid }: ScoreInputProps) {
    return (
        <TextInput
            accessibilityLabel={accessibilityLabel}
            className={cn(
                'w-14 rounded-md border-2 border-transparent bg-surface-sunken px-0.5 py-1.5 text-center font-display text-[32px] leading-[34px] text-text',
                invalid && 'border-accent',
            )}
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={onChangeText}
            placeholder=""
            value={value}
        />
    );
}
