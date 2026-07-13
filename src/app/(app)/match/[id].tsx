import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { markTies } from '@/features/leagues/ranking';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { MatchHero } from '@/features/matches/components/match-hero';
import { matchPhase } from '@/features/matches/match-phase';
import { useMatch } from '@/features/matches/use-match';
import { LockedPredictionCard } from '@/features/predictions/components/locked-prediction-card';
import { MaskedPredictions } from '@/features/predictions/components/masked-predictions';
import { MemberPredictionRow } from '@/features/predictions/components/member-prediction-row';
import { PredictionCard } from '@/features/predictions/components/prediction-card';
import { ResultCard } from '@/features/predictions/components/result-card';
import { useCommunityDistributions } from '@/features/predictions/use-community-distributions';
import { useMatchLeaguePredictions } from '@/features/predictions/use-match-league-predictions';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { ScrollView, Text, useThemeColor, View } from '@/tw';

type LeagueView = 'predictions' | 'leaderboard';

/**
 * Page de détail d'un match (maquette Match Detail, sans la timeline —
 * retirée du MVP faute de données) : hero score/live/coup d'envoi, mon prono
 * selon la phase (éditable / verrouillé / réconcilié) et les pronos +
 * classement de mes ligues. La liste des pronos des autres n'apparaît
 * qu'après le kickoff (garanti serveur par la RPC, le client n'est qu'une UX).
 */
export default function MatchScreen() {
    const { t } = useTranslation(['matches', 'predictions', 'leagues', 'common']);
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id;
    const accentColor = useThemeColor('accent');

    const match = useMatch(id);
    const competitionId = match.data?.competition_id;
    const phase = match.data ? matchPhase(match.data, new Date()) : null;
    const kickoffPassed = phase !== null && phase !== 'upcoming';

    const myPredictions = useMyPredictions(competitionId);
    const distributions = useCommunityDistributions(competitionId);
    const myLeagues = useMyLeagues();

    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [view, setView] = useState<LeagueView>('predictions');

    const leagues = myLeagues.data ?? [];
    const currentLeagueId = selectedLeagueId ?? leagues[0]?.id;
    const currentLeague = leagues.find((league) => league.id === currentLeagueId);

    const leaguePredictions = useMatchLeaguePredictions(
        id,
        view === 'predictions' ? currentLeagueId : undefined,
        kickoffPassed,
    );
    const leagueBoard = useLeagueLeaderboard(view === 'leaderboard' ? currentLeagueId : undefined);

    if (match.isPending) {
        return (
            <View className="flex-1 gap-3 bg-bg p-6">
                <Skeleton className="h-40" variant="block" />
                <Skeleton className="h-52" variant="block" />
                <Skeleton className="h-14" variant="block" />
                <Skeleton className="h-14" variant="block" />
            </View>
        );
    }

    if (match.isError) {
        return (
            <View className="flex-1 items-center justify-center bg-bg p-6">
                <EmptyState
                    action={
                        <Button
                            onPress={() => void match.refetch()}
                            title={t('common:actions.retry')}
                            variant="secondary"
                        />
                    }
                    title={t('matches:errors.load')}
                />
            </View>
        );
    }

    if (!match.data) {
        return (
            <View className="flex-1 items-center justify-center bg-bg p-6">
                <EmptyState title={t('matches:detail.notFound')} />
            </View>
        );
    }

    const currentMatch = match.data;
    const prediction = myPredictions.data?.get(currentMatch.id);
    const distribution = distributions.data?.get(currentMatch.id);
    const boardEntries = markTies(leagueBoard.data ?? []);

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-5 self-center p-6">
            <MatchHero match={currentMatch} />

            {/* Mon prono, selon la phase */}
            <View className="gap-3">
                <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                    {t('predictions:reconciliation.yourProno')}
                </Text>
                {phase === 'upcoming' && userId ? (
                    <View className="gap-2.5">
                        <PredictionCard
                            distribution={distribution}
                            match={currentMatch}
                            prediction={prediction}
                            userId={userId}
                        />
                        <Text className="text-center font-body text-[12px] text-text-muted">
                            {t('predictions:toPredict.autoSave')}
                        </Text>
                    </View>
                ) : phase === 'finished' ? (
                    <ResultCard
                        distribution={distribution}
                        match={currentMatch}
                        prediction={prediction}
                    />
                ) : (
                    <LockedPredictionCard match={currentMatch} prediction={prediction} />
                )}
            </View>

            {/* Mes ligues : pronos des membres + classement */}
            {myLeagues.isPending ? null : leagues.length === 0 ? (
                <View className="items-center gap-3 rounded-lg border border-border bg-surface px-5 py-6 tc-shadow-sm">
                    <Text className="text-center font-display text-[22px] text-text">
                        {t('leagues:hero.title')}
                    </Text>
                    <Text className="max-w-[260px] text-center font-body text-[13px] leading-[19px] text-text-muted">
                        {t('leagues:hero.message')}
                    </Text>
                    <View className="mt-1 w-full max-w-[280px] gap-2.5">
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
                </View>
            ) : (
                <View className="gap-3">
                    <View className="flex-row items-center justify-between gap-2">
                        <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                            {t('leagues:leaderboard.tabs.leagues')}
                        </Text>
                        {leagues.length === 1 ? (
                            <Text className="font-body text-[11px] text-text-faint">
                                {t('matches:detail.singleLeague')}
                            </Text>
                        ) : null}
                    </View>

                    {leagues.length > 1 && currentLeagueId ? (
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
                    ) : null}

                    <SegmentedControl
                        onChange={setView}
                        options={[
                            {
                                value: 'predictions',
                                label: t('matches:detail.tabs.predictions'),
                            },
                            {
                                value: 'leaderboard',
                                label: t('matches:detail.tabs.leaderboard'),
                            },
                        ]}
                        value={view}
                    />

                    {currentLeague ? (
                        <View className="flex-row items-baseline justify-between gap-2 px-0.5">
                            <Text className="font-body-bold text-[12px] text-text-muted">
                                {currentLeague.name}
                            </Text>
                            <Text className="font-body-bold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                                {t('leagues:leaderboard.players', {
                                    count: currentLeague.member_count,
                                })}
                            </Text>
                        </View>
                    ) : null}

                    {view === 'predictions' ? (
                        !kickoffPassed ? (
                            <MaskedPredictions />
                        ) : leaguePredictions.isPending ? (
                            <View className="gap-2">
                                <Skeleton className="h-14" variant="block" />
                                <Skeleton className="h-14" variant="block" />
                                <Skeleton className="h-14" variant="block" />
                            </View>
                        ) : leaguePredictions.isError ? (
                            <EmptyState
                                action={
                                    <Button
                                        onPress={() => void leaguePredictions.refetch()}
                                        title={t('common:actions.retry')}
                                        variant="secondary"
                                    />
                                }
                                title={t('leagues:errors.load')}
                            />
                        ) : (
                            <View className="gap-2">
                                {leaguePredictions.data.map((entry) => (
                                    <MemberPredictionRow
                                        entry={entry}
                                        isMe={entry.user_id === userId}
                                        key={entry.user_id}
                                        match={currentMatch}
                                    />
                                ))}
                            </View>
                        )
                    ) : leagueBoard.isPending ? (
                        <View className="gap-2">
                            <Skeleton className="h-16" variant="block" />
                            <Skeleton className="h-16" variant="block" />
                            <Skeleton className="h-16" variant="block" />
                        </View>
                    ) : leagueBoard.isError ? (
                        <EmptyState
                            action={
                                <Button
                                    onPress={() => void leagueBoard.refetch()}
                                    title={t('common:actions.retry')}
                                    variant="secondary"
                                />
                            }
                            title={t('leagues:errors.load')}
                        />
                    ) : (
                        <View className="gap-2">
                            {boardEntries.map((entry) => (
                                <LeaderboardRow
                                    entry={entry}
                                    isMe={entry.user_id === userId}
                                    key={entry.user_id}
                                    tie={entry.tie}
                                />
                            ))}
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );
}
