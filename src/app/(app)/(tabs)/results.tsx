import { PrimaryButton } from '@/components/form';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { ResultCard } from '@/features/predictions/components/result-card';
import { splitMatches } from '@/features/predictions/split-matches';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { ActivityIndicator, ScrollView, Text, View } from '@/tw';

export default function ResultsScreen() {
    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);
    const predictions = useMyPredictions(competition.data?.id);

    if (
        competition.isPending ||
        (competition.data && (matches.isPending || predictions.isPending))
    ) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
            </View>
        );
    }

    if (competition.isError || matches.isError || predictions.isError) {
        return (
            <View className="flex-1 items-center justify-center gap-4 p-6">
                <Text className="text-center text-base text-gray-600">
                    Impossible de charger les résultats.
                </Text>
                <PrimaryButton
                    title="Réessayer"
                    onPress={() => {
                        void competition.refetch();
                        void matches.refetch();
                        void predictions.refetch();
                    }}
                />
            </View>
        );
    }

    const results = matches.data ? splitMatches(matches.data, new Date()).results : [];

    if (!competition.data || results.length === 0) {
        return (
            <View className="flex-1 items-center justify-center gap-2 p-6">
                <Text className="text-3xl">🏉</Text>
                <Text className="text-center text-base text-gray-500">
                    Aucun match joué pour le moment.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-6 pt-16">
            <Text className="text-2xl font-bold text-gray-900">Résultats</Text>
            {results.map((match) => (
                <ResultCard
                    key={match.id}
                    match={match}
                    prediction={predictions.data?.get(match.id)}
                />
            ))}
        </ScrollView>
    );
}
