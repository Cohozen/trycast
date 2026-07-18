import { useRouter } from 'expo-router';
import { Globe, Settings2, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { PinnedMeRow } from '@/features/leagues/components/pinned-me-row';
import { Podium } from '@/features/leagues/components/podium';
import { markTies } from '@/features/leagues/ranking';
import { useGlobalLeaderboard } from '@/features/leagues/use-global-leaderboard';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useMyRank } from '@/features/leagues/use-my-rank';
import { useMyStanding } from '@/features/leagues/use-my-standing';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useProfile } from '@/features/profile/use-profile';
import { Pressable, ScrollView, Text, useThemeColor, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

const PAGE_SIZE = 50;

type Scope = 'leagues' | 'global';

/**
 * Classement (maquette) : bascule Ligues/Général, sélecteur de ligue en
 * dropdown, podium, ex æquo et ma position épinglée quand je suis hors du
 * top affiché du général.
 */
export default function LeaderboardScreen() {
    const { t } = useTranslation(['leagues', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id;
    const competition = useActiveCompetition();
    const myLeagues = useMyLeagues();
    const { data: profile } = useProfile(userId ?? '');

    const [scope, setScope] = useState<Scope>('leagues');
    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const textMuted = useThemeColor('text-muted');
    const accentColor = useThemeColor('accent');
    const brandColor = useThemeColor('brand');
    const screenInsets = useScreenInsets();

    const leagues = myLeagues.data ?? [];
    const currentLeagueId = selectedLeagueId ?? leagues[0]?.id;
    const currentLeague = leagues.find((league) => league.id === currentLeagueId);
    const effectiveScope: Scope = leagues.length === 0 ? 'global' : scope;

    const globalBoard = useGlobalLeaderboard(
        effectiveScope === 'global' ? competition.data?.id : undefined,
        limit,
    );
    const leagueBoard = useLeagueLeaderboard(
        effectiveScope === 'leagues' ? currentLeagueId : undefined,
    );
    const board = effectiveScope === 'global' ? globalBoard : leagueBoard;

    const standing = useMyStanding(competition.data?.id, userId);
    const myRank = useMyRank(competition.data?.id, standing.isPending ? undefined : standing.data);

    const loading =
        competition.isPending ||
        myLeagues.isPending ||
        (effectiveScope === 'global'
            ? globalBoard.isPending
            : !!currentLeagueId && leagueBoard.isPending);

    if (competition.isError || myLeagues.isError || board.isError) {
        return (
            <View className="flex-1 items-center justify-center bg-bg p-6">
                <EmptyState
                    action={
                        <Button
                            onPress={() => {
                                void competition.refetch();
                                void myLeagues.refetch();
                                void board.refetch();
                            }}
                            title={t('common:actions.retry')}
                            variant="secondary"
                        />
                    }
                    title={t('leagues:errors.load')}
                />
            </View>
        );
    }

    const entries = markTies(board.data ?? []);
    const hasTies = entries.some((entry) => entry.tie);
    const showPinnedMe =
        effectiveScope === 'global' &&
        standing.data != null &&
        myRank.data?.rank != null &&
        profile != null &&
        entries.length > 0 &&
        !entries.some((entry) => entry.user_id === userId);

    return (
        <View className="flex-1 bg-bg">
            <ScrollView
                className="flex-1"
                contentContainerClassName="w-full max-w-[800px] gap-4 self-center px-5"
                contentContainerStyle={{
                    paddingTop: screenInsets.top,
                    paddingBottom: screenInsets.bottomTabBar,
                }}>
                <View className="gap-1">
                    <Text className="font-display text-[30px] leading-[30px] tracking-[0.3px] text-text">
                        {t('leagues:leaderboard.title')}
                    </Text>
                    {competition.data ? (
                        <Text className="font-body text-[13px] text-text-muted">
                            {competition.data.name}
                        </Text>
                    ) : null}
                </View>

                {leagues.length > 0 ? (
                    <SegmentedControl
                        onChange={setScope}
                        options={[
                            { value: 'leagues', label: t('leagues:leaderboard.tabs.leagues') },
                            { value: 'global', label: t('leagues:leaderboard.tabs.global') },
                        ]}
                        value={effectiveScope}
                    />
                ) : null}

                {effectiveScope === 'leagues' && leagues.length > 0 && currentLeagueId ? (
                    <View className="gap-2.5">
                        <Select
                            accessibilityLabel={t('leagues:leaderboard.select.overline')}
                            icon={<Users color={accentColor} size={18} strokeWidth={1.9} />}
                            onChange={setSelectedLeagueId}
                            options={leagues.map((league) => ({
                                value: league.id,
                                label: league.name,
                                description: t('leagues:detail.members', {
                                    count: league.member_count,
                                }),
                            }))}
                            overline={t('leagues:leaderboard.select.overline')}
                            trailing={
                                currentLeague
                                    ? t('leagues:detail.members', {
                                        count: currentLeague.member_count,
                                    })
                                    : undefined
                            }
                            value={currentLeagueId}
                        />
                        <View className="flex-row items-center gap-1.5 self-end">
                            <Button
                                size="sm"
                                onPress={() =>
                                    router.push({
                                        pathname: '/league/[id]',
                                        params: { id: currentLeagueId },
                                    })
                                }
                                title={t('leagues:leaderboard.manage')}
                                variant="secondary"
                                leadingIcon={
                                    <Settings2 color={textMuted} size={18} strokeWidth={1.9} />
                                }
                            />
                        </View>
                    </View>
                ) : null}

                {effectiveScope === 'global' ? (
                    <Card className="flex-row items-center gap-2.5 px-3.5 py-2.75">
                        <View className="h-[34px] w-[34px] items-center justify-center rounded-sm bg-brand/10">
                            <Globe color={brandColor} size={18} strokeWidth={1.9} />
                        </View>
                        <View className="min-w-0 flex-1 gap-px">
                            <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                                {t('leagues:leaderboard.general.overline')}
                            </Text>
                            <Text className="font-body-bold text-[15px] text-text">
                                {t('leagues:leaderboard.general.title')}
                            </Text>
                        </View>
                        {myRank.data ? (
                            <Text className="font-body text-[12px] text-text-muted">
                                {t('leagues:leaderboard.players', { count: myRank.data.total })}
                            </Text>
                        ) : null}
                    </Card>
                ) : null}

                {loading ? (
                    <View className="gap-2.5">
                        <Skeleton className="h-16" variant="block" />
                        <Skeleton className="h-16" variant="block" />
                        <Skeleton className="h-16" variant="block" />
                    </View>
                ) : entries.length === 0 ? (
                    <EmptyState
                        action={
                            leagues.length === 0 ? (
                                <View className="w-full min-w-[240px] gap-2.5">
                                    <Button
                                        fullWidth
                                        onPress={() => router.push('/league/new')}
                                        title={t('leagues:actions.create')}
                                    />
                                    <Button
                                        fullWidth
                                        onPress={() =>
                                            router.push({
                                                pathname: '/league/new',
                                                params: { tab: 'join' },
                                            })
                                        }
                                        title={t('leagues:actions.join')}
                                        variant="secondary"
                                    />
                                </View>
                            ) : undefined
                        }
                        message={t('leagues:leaderboard.empty')}
                        title={t('leagues:leaderboard.title')}
                    />
                ) : (
                    <View className="gap-4">
                        {entries.length >= 3 ? (
                            <Podium entries={entries} meUserId={userId} />
                        ) : null}

                        <View className="gap-2">
                            <View className="flex-row items-baseline justify-between gap-2 px-0.5">
                                <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                                    {t('leagues:leaderboard.full')}
                                </Text>
                                <Text className="font-body-bold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                                    {t('leagues:leaderboard.players', { count: entries.length })}
                                </Text>
                            </View>
                            {entries.map((entry) => (
                                <LeaderboardRow
                                    entry={entry}
                                    isMe={entry.user_id === userId}
                                    key={entry.user_id}
                                    tie={entry.tie}
                                />
                            ))}
                            {hasTies ? (
                                <Text className="px-1 pt-1 font-body text-[12px] leading-[17px] text-text-muted">
                                    {t('leagues:leaderboard.tieNote')}
                                </Text>
                            ) : null}
                            {effectiveScope === 'global' && entries.length === limit ? (
                                <Pressable
                                    accessibilityRole="button"
                                    className="items-center py-3"
                                    onPress={() => setLimit((current) => current + PAGE_SIZE)}>
                                    <Text className="font-body-semibold text-[13px] text-accent">
                                        {t('leagues:leaderboard.loadMore')}
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                )}
            </ScrollView>

            {showPinnedMe && standing.data && myRank.data?.rank != null && profile ? (
                <PinnedMeRow
                    avatarUrl={profile.avatar_url}
                    gapToAbove={myRank.data.gapToAbove}
                    points={standing.data.total_points}
                    rank={myRank.data.rank}
                    username={profile.username}
                />
            ) : null}
        </View>
    );
}
