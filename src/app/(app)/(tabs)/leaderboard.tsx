import { useState } from 'react';

import { PrimaryButton } from '@/components/form';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { useGlobalLeaderboard } from '@/features/leagues/use-global-leaderboard';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from '@/tw';

const PAGE_SIZE = 50;

export default function LeaderboardScreen() {
    const { session } = useSession();
    const competition = useActiveCompetition();
    const [limit, setLimit] = useState(PAGE_SIZE);
    const leaderboard = useGlobalLeaderboard(competition.data?.id, limit);

    if (competition.isPending || (competition.data && leaderboard.isPending)) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
            </View>
        );
    }

    if (competition.isError || leaderboard.isError) {
        return (
            <View className="flex-1 items-center justify-center gap-4 p-6">
                <Text className="text-center text-base text-gray-600">
                    Impossible de charger le classement.
                </Text>
                <PrimaryButton
                    title="Réessayer"
                    onPress={() => {
                        void competition.refetch();
                        void leaderboard.refetch();
                    }}
                />
            </View>
        );
    }

    const entries = leaderboard.data ?? [];

    if (!competition.data || entries.length === 0) {
        return (
            <View className="flex-1 items-center justify-center gap-2 p-6">
                <Text className="text-3xl">🏆</Text>
                <Text className="text-center text-base text-gray-500">
                    Le classement apparaîtra après les premiers matchs scorés.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerClassName="gap-2 p-6 pt-16">
            <Text className="text-2xl font-bold text-gray-900">Classement</Text>
            <Text className="mb-2 text-sm text-gray-500">Général — {competition.data.name}</Text>
            {entries.map((entry) => (
                <LeaderboardRow
                    key={entry.user_id}
                    entry={entry}
                    isMe={entry.user_id === session?.user.id}
                />
            ))}
            {entries.length === limit ? (
                <Pressable
                    className="items-center py-3"
                    accessibilityRole="button"
                    onPress={() => setLimit((current) => current + PAGE_SIZE)}>
                    <Text className="text-sm font-semibold text-emerald-700">Charger plus</Text>
                </Pressable>
            ) : null}
        </ScrollView>
    );
}
