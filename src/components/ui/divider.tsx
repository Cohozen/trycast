import { Text, View } from '@/tw';

/**
 * Séparateur horizontal, avec un libellé centré optionnel (« ou »).
 */
export function Divider({ label }: { label?: string }) {
    if (!label) {
        return <View className="h-px bg-border" />;
    }

    return (
        <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="font-body-medium text-[12px] uppercase tracking-[0.6px] text-text-faint">
                {label}
            </Text>
            <View className="h-px flex-1 bg-border" />
        </View>
    );
}
