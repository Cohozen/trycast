import { TextInput } from '@/tw';

type ScoreInputProps = {
    value: string;
    onChangeText: (value: string) => void;
    accessibilityLabel: string;
    invalid?: boolean;
};

/** Champ de score compact (entier positif), une case par équipe. */
export function ScoreInput({ value, onChangeText, accessibilityLabel, invalid }: ScoreInputProps) {
    return (
        <TextInput
            className={`w-16 rounded-xl border bg-white px-2 py-2 text-center text-lg font-bold text-gray-900 ${
                invalid ? 'border-red-400' : 'border-gray-300'
            }`}
            value={value}
            onChangeText={onChangeText}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="–"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel={accessibilityLabel}
        />
    );
}
