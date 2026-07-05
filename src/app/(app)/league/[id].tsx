import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Share } from 'react-native';

import { PrimaryButton } from '@/components/form';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import type { LeaderboardEntry } from '@/features/leagues/types';
import { useDeleteLeague } from '@/features/leagues/use-delete-league';
import { useKickMember } from '@/features/leagues/use-kick-member';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useLeaveLeague } from '@/features/leagues/use-leave-league';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from '@/tw';

export default function LeagueScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id;

    const leagues = useMyLeagues();
    const leaderboard = useLeagueLeaderboard(id);
    const leaveLeague = useLeaveLeague(userId ?? '');
    const deleteLeague = useDeleteLeague();
    const kickMember = useKickMember(id);

    const league = leagues.data?.find((row) => row.id === id);
    const isOwner = !!league && league.owner_id === userId;

    if (leagues.isPending || leaderboard.isPending) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
            </View>
        );
    }

    // RLS : un non-membre (exclu, parti) ne voit ni la ligue ni son classement
    if (!league || leaderboard.isError || !leaderboard.data) {
        return (
            <View className="flex-1 items-center justify-center gap-2 p-6">
                <Text className="text-center text-base text-gray-500">Ligue introuvable.</Text>
            </View>
        );
    }

    const onShare = () => {
        void Share.share({
            message: `Rejoins ma ligue « ${league.name} » sur TryCast avec le code ${league.invite_code} !`,
        });
    };

    const onLeave = () => {
        Alert.alert('Quitter la ligue', `Tu ne verras plus le classement de « ${league.name} ».`, [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Quitter',
                style: 'destructive',
                onPress: () => leaveLeague.mutate(league.id, { onSuccess: () => router.back() }),
            },
        ]);
    };

    const onDelete = () => {
        Alert.alert(
            'Supprimer la ligue',
            `« ${league.name} » et ses membres seront supprimés. Cette action est définitive.`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () =>
                        deleteLeague.mutate(league.id, { onSuccess: () => router.back() }),
                },
            ],
        );
    };

    const onKick = (entry: LeaderboardEntry) => {
        if (!isOwner || entry.user_id === userId) return;
        Alert.alert('Exclure ce membre', `Retirer ${entry.username} de la ligue ?`, [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Exclure',
                style: 'destructive',
                onPress: () => kickMember.mutate(entry.user_id),
            },
        ]);
    };

    const memberCount = leaderboard.data.length;

    return (
        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-6">
            <Stack.Screen options={{ title: league.name }} />

            <View className="gap-1">
                <Text className="text-sm text-gray-500">
                    {memberCount} membre{memberCount > 1 ? 's' : ''} · code {league.invite_code}
                </Text>
                {isOwner ? (
                    <Text className="text-xs text-gray-400">
                        Appui long sur un membre pour l’exclure.
                    </Text>
                ) : null}
            </View>

            <PrimaryButton title="Inviter des amis" onPress={onShare} />

            <View className="gap-2">
                {leaderboard.data.map((entry) => (
                    <Pressable
                        key={entry.user_id}
                        accessibilityRole="button"
                        onLongPress={() => onKick(entry)}>
                        <LeaderboardRow entry={entry} isMe={entry.user_id === userId} />
                    </Pressable>
                ))}
            </View>

            <View className="pt-4">
                {isOwner ? (
                    <PrimaryButton
                        title="Supprimer la ligue"
                        variant="danger"
                        loading={deleteLeague.isPending}
                        onPress={onDelete}
                    />
                ) : (
                    <PrimaryButton
                        title="Quitter la ligue"
                        variant="danger"
                        loading={leaveLeague.isPending}
                        onPress={onLeave}
                    />
                )}
            </View>
        </ScrollView>
    );
}
