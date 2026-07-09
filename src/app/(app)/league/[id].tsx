import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Share } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import type { LeaderboardEntry } from '@/features/leagues/types';
import { useDeleteLeague } from '@/features/leagues/use-delete-league';
import { useKickMember } from '@/features/leagues/use-kick-member';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useLeaveLeague } from '@/features/leagues/use-leave-league';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { Pressable, ScrollView, Text, View } from '@/tw';

export default function LeagueScreen() {
    const { t } = useTranslation(['leagues', 'common']);
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
            <View className="flex-1 gap-2.5 bg-bg p-6">
                <Skeleton className="h-5 w-52" variant="line" />
                <Skeleton className="h-12" variant="block" />
                <Skeleton className="h-16" variant="block" />
                <Skeleton className="h-16" variant="block" />
            </View>
        );
    }

    // RLS : un non-membre (exclu, parti) ne voit ni la ligue ni son classement
    if (!league || leaderboard.isError || !leaderboard.data) {
        return (
            <View className="flex-1 items-center justify-center bg-bg p-6">
                <EmptyState title={t('leagues:detail.notFound')} />
            </View>
        );
    }

    const onShare = () => {
        void Share.share({
            message: t('leagues:detail.shareMessage', {
                name: league.name,
                code: league.invite_code,
            }),
        });
    };

    const onLeave = () => {
        Alert.alert(
            t('leagues:detail.leave.title'),
            t('leagues:detail.leave.message', { name: league.name }),
            [
                { text: t('common:actions.cancel'), style: 'cancel' },
                {
                    text: t('leagues:detail.leave.confirm'),
                    style: 'destructive',
                    onPress: () =>
                        leaveLeague.mutate(league.id, { onSuccess: () => router.back() }),
                },
            ],
        );
    };

    const onDelete = () => {
        Alert.alert(
            t('leagues:detail.delete.title'),
            t('leagues:detail.delete.message', { name: league.name }),
            [
                { text: t('common:actions.cancel'), style: 'cancel' },
                {
                    text: t('leagues:detail.delete.confirm'),
                    style: 'destructive',
                    onPress: () =>
                        deleteLeague.mutate(league.id, { onSuccess: () => router.back() }),
                },
            ],
        );
    };

    const onKick = (entry: LeaderboardEntry) => {
        if (!isOwner || entry.user_id === userId) return;
        Alert.alert(
            t('leagues:detail.kick.title'),
            t('leagues:detail.kick.message', { username: entry.username }),
            [
                { text: t('common:actions.cancel'), style: 'cancel' },
                {
                    text: t('leagues:detail.kick.confirm'),
                    style: 'destructive',
                    onPress: () => kickMember.mutate(entry.user_id),
                },
            ],
        );
    };

    const memberCount = leaderboard.data.length;

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-4 self-center p-6">
            <Stack.Screen options={{ title: league.name }} />

            <View className="gap-1">
                <Text className="font-body text-[13px] text-text-muted">
                    {t('leagues:detail.members', { count: memberCount })} ·{' '}
                    {t('leagues:detail.code', { code: league.invite_code })}
                </Text>
                {isOwner ? (
                    <Text className="font-body text-[12px] text-text-faint">
                        {t('leagues:detail.kickHint')}
                    </Text>
                ) : null}
            </View>

            <Button fullWidth onPress={onShare} title={t('leagues:detail.invite')} />

            <View className="gap-2">
                {leaderboard.data.map((entry) => (
                    <Pressable
                        accessibilityRole="button"
                        key={entry.user_id}
                        onLongPress={() => onKick(entry)}>
                        <LeaderboardRow entry={entry} isMe={entry.user_id === userId} />
                    </Pressable>
                ))}
            </View>

            <View className="pt-4">
                {isOwner ? (
                    <Button
                        fullWidth
                        loading={deleteLeague.isPending}
                        onPress={onDelete}
                        title={t('leagues:detail.delete.title')}
                        variant="danger-outline"
                    />
                ) : (
                    <Button
                        fullWidth
                        loading={leaveLeague.isPending}
                        onPress={onLeave}
                        title={t('leagues:detail.leave.title')}
                        variant="danger-outline"
                    />
                )}
            </View>
        </ScrollView>
    );
}
