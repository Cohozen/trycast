import { ScrollView, Text, View } from '@/tw';

export default function HomeScreen() {
    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow justify-center gap-2 p-6">
            <View className="items-center gap-2">
                <Text className="text-3xl font-bold text-gray-900">TryCast 🏉</Text>
                <Text className="text-center text-base text-gray-500">
                    Les matchs et les pronostics arrivent bientôt (Lot 2).
                </Text>
            </View>
        </ScrollView>
    );
}
