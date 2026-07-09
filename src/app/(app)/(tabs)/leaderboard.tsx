import { useRouter } from 'expo-router';
import { Settings2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { useGlobalLeaderboard } from '@/features/leagues/use-global-leaderboard';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { Pressable, ScrollView, Text, useCSSVariable, View } from '@/tw';

const PAGE_SIZE = 50;

type Scope = 'leagues' | 'global';

/**
 * Classement (maquette) : bascule Ligues/Général. Le volet Ligues porte le
 * sélecteur de ligue en chips et l'accès à la gestion — l'onglet Ligues a
 * disparu avec le passage à 4 onglets (décision Lot 5.5).
 */
export default function LeaderboardScreen() {
    const { t } = useTranslation(['leagues', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const competition = useActiveCompetition();
    const myLeagues = useMyLeagues();

    const [scope, setScope] = useState<Scope>('leagues');
    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const textMuted = useCSSVariable('--text-muted');

    const leagues = myLeagues.data ?? [];
    const currentLeagueId = selectedLeagueId ?? leagues[0]?.id;
    const effectiveScope: Scope = leagues.length === 0 ? 'global' : scope;

    const globalBoard = useGlobalLeaderboard(
        effectiveScope === 'global' ? competition.data?.id : undefined,
        limit,
    );
    const leagueBoard = useLeagueLeaderboard(
        effectiveScope === 'leagues' ? currentLeagueId : undefined,
    );
    const board = effectiveScope === 'global' ? globalBoard : leagueBoard;

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

    const entries = board.data ?? [];

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-4 self-center px-5 pb-32 pt-14">
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

            {effectiveScope === 'leagues' && leagues.length > 0 ? (
                <View className="gap-3">
                    <ScrollView
                        contentContainerClassName="gap-2 pr-2"
                        horizontal
                        showsHorizontalScrollIndicator={false}>
                        {leagues.map((league) => (
                            <Chip
                                key={league.id}
                                label={league.name}
                                onPress={() => setSelectedLeagueId(league.id)}
                                selected={league.id === currentLeagueId}
                            />
                        ))}
                    </ScrollView>
                    {currentLeagueId ? (
                        <Pressable
                            accessibilityRole="button"
                            className="flex-row items-center gap-1.5 self-end"
                            onPress={() =>
                                router.push({
                                    pathname: '/league/[id]',
                                    params: { id: currentLeagueId },
                                })
                            }>
                            <Settings2 color={textMuted as string} size={14} strokeWidth={2} />
                            <Text className="font-body-semibold text-[12.5px] text-text-muted">
                                {t('leagues:leaderboard.manage')}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
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
                                    onPress={() => router.push('/league/create')}
                                    title={t('leagues:actions.create')}
                                />
                                <Button
                                    fullWidth
                                    onPress={() => router.push('/league/join')}
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
                <View className="gap-2">
                    {entries.map((entry) => (
                        <LeaderboardRow
                            entry={entry}
                            isMe={entry.user_id === session?.user.id}
                            key={entry.user_id}
                        />
                    ))}
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
            )}
        </ScrollView>
    );
}
