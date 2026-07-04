import { Pressable, Text, View } from '@/tw';

type BonusCheckboxProps = {
    label: string;
    checked: boolean;
    onToggle: () => void;
};

/** Case « bonus offensif » d'une équipe (validée à 4 essais marqués). */
export function BonusCheckbox({ label, checked, onToggle }: BonusCheckboxProps) {
    return (
        <Pressable
            className="flex-row items-center gap-1.5"
            onPress={onToggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={label}>
            <View
                className={`h-5 w-5 items-center justify-center rounded-md border ${
                    checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                }`}>
                {checked ? <Text className="text-xs font-bold text-white">✓</Text> : null}
            </View>
            <Text className="text-xs text-gray-600">{label}</Text>
        </Pressable>
    );
}
