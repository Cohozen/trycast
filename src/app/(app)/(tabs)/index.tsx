import { PrimaryButton } from '@/components/form';
import { useSession } from '@/features/auth/session-context';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { UpcomingMatchCard } from '@/features/predictions/components/upcoming-match-card';
import { splitMatches } from '@/features/predictions/split-matches';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { ActivityIndicator, ScrollView, Text, View } from '@/tw';

export default function MatchesScreen() {
    const { session } = useSession();
    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);
    const predictions = useMyPredictions(competition.data?.id);
    const userId = session?.user.id;

    if (
        !userId ||
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
                    Impossible de charger les matchs.
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

    if (!competition.data || !matches.data) {
        return (
            <View className="flex-1 items-center justify-center gap-2 p-6">
                <Text className="text-3xl">🏉</Text>
                <Text className="text-center text-base text-gray-500">
                    Aucun match au programme pour le moment.
                </Text>
            </View>
        );
    }

    const { upcoming } = splitMatches(matches.data, new Date());

    return (
        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-6 pt-16">
            <Text className="text-2xl font-bold text-gray-900">{competition.data.name}</Text>
            {upcoming.length === 0 ? (
                <Text className="text-center text-base text-gray-500">
                    Aucun match à venir — rendez-vous dans l’onglet Résultats.
                </Text>
            ) : (
                upcoming.map((match) => (
                    <UpcomingMatchCard
                        key={match.id}
                        match={match}
                        prediction={predictions.data?.get(match.id)}
                        userId={userId}
                    />
                ))
            )}
        </ScrollView>
    );
}
