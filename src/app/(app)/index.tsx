import { PrimaryButton } from '@/components/form';
import { RoundSection } from '@/features/matches/components/round-section';
import { groupMatchesByRound } from '@/features/matches/group-matches-by-round';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { ActivityIndicator, ScrollView, Text, View } from '@/tw';

export default function MatchesScreen() {
    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);

    if (competition.isPending || (competition.data && matches.isPending)) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
            </View>
        );
    }

    if (competition.isError || matches.isError) {
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
                    }}
                />
            </View>
        );
    }

    if (!competition.data || !matches.data || matches.data.length === 0) {
        return (
            <View className="flex-1 items-center justify-center gap-2 p-6">
                <Text className="text-3xl">🏉</Text>
                <Text className="text-center text-base text-gray-500">
                    Aucun match au programme pour le moment.
                </Text>
            </View>
        );
    }

    const rounds = groupMatchesByRound(matches.data);

    return (
        <ScrollView className="flex-1" contentContainerClassName="gap-6 p-6 pt-16">
            <Text className="text-2xl font-bold text-gray-900">{competition.data.name}</Text>
            {rounds.map((group) => (
                <RoundSection key={group.round} round={group.round} matches={group.matches} />
            ))}
        </ScrollView>
    );
}
