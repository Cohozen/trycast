import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleHelp, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { CollapsingHeader } from '@/components/ui/collapsing-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePullToRefresh } from '@/components/ui/use-pull-to-refresh';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { markTies } from '@/features/leagues/ranking';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { MatchHero } from '@/features/matches/components/match-hero';
import { matchPhase } from '@/features/matches/match-phase';
import type { MatchDetail } from '@/features/matches/types';
import { useMatch } from '@/features/matches/use-match';
import { LockedPredictionCard } from '@/features/predictions/components/locked-prediction-card';
import { MaskedPredictions } from '@/features/predictions/components/masked-predictions';
import { MemberPredictionRow } from '@/features/predictions/components/member-prediction-row';
import { PredictionCard } from '@/features/predictions/components/prediction-card';
import { ResultCard } from '@/features/predictions/components/result-card';
import { useCommunityDistributions } from '@/features/predictions/use-community-distributions';
import { useMatchLeaguePredictions } from '@/features/predictions/use-match-league-predictions';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { useOpenPlayerProfile } from '@/features/profile/use-open-player-profile';
import { Pressable, Text, useThemeColor, View } from '@/tw';

type LeagueView = 'predictions' | 'leaderboard';

/**
 * Titre de la barre compacte, une fois le hero replié : codes des deux équipes,
 * et le score dès qu'il existe (live ou final) — c'est ce qu'on veut garder
 * sous les yeux quand le gros score a disparu.
 */
function compactMatchLabel(match: MatchDetail): string {
    const home = match.home_team?.code ?? '—';
    const away = match.away_team?.code ?? '—';
    const live = match.status === 'in_play';
    const hasScore =
        live ||
        (match.status === 'finished' && match.home_score !== null && match.away_score !== null);
    if (!hasScore) return `${home} – ${away}`;
    const homeScore = live ? (match.live_home_score ?? 0) : match.home_score;
    const awayScore = live ? (match.live_away_score ?? 0) : match.away_score;
    return `${home} ${homeScore} – ${awayScore} ${away}`;
}

/**
 * Page de détail d'un match (maquette Match Detail, sans la timeline —
 * retirée du MVP faute de données) : hero score/live/coup d'envoi, mon prono
 * selon la phase (éditable / verrouillé / réconcilié) et les pronos +
 * classement de mes ligues. La liste des pronos des autres n'apparaît
 * qu'après le kickoff (garanti serveur par la RPC, le client n'est qu'une UX).
 */
export default function MatchScreen() {
    const { t } = useTranslation(['matches', 'predictions', 'leagues', 'scoring', 'common']);
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id;
    const accentColor = useThemeColor('accent');
    const textFaintColor = useThemeColor('text-faint');

    const openPlayerProfile = useOpenPlayerProfile(userId);

    const match = useMatch(id);
    const competitionId = match.data?.competition_id;
    const phase = match.data ? matchPhase(match.data, new Date()) : null;
    const kickoffPassed = phase !== null && phase !== 'upcoming';

    const myPredictions = useMyPredictions(competitionId);
    const distributions = useCommunityDistributions(competitionId);
    const myLeagues = useMyLeagues();

    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [view, setView] = useState<LeagueView>('predictions');
    const [headerHeight, setHeaderHeight] = useState(0);

    // KeyboardAwareScrollView rend un Reanimated.ScrollView et diffuse ses
    // props : un handler animé s'y attache comme sur un Animated.ScrollView.
    const scrollY = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const leagues = myLeagues.data ?? [];
    const currentLeagueId = selectedLeagueId ?? leagues[0]?.id;
    const currentLeague = leagues.find((league) => league.id === currentLeagueId);

    const leaguePredictions = useMatchLeaguePredictions(
        id,
        view === 'predictions' ? currentLeagueId : undefined,
        kickoffPassed,
    );
    const leagueBoard = useLeagueLeaderboard(view === 'leaderboard' ? currentLeagueId : undefined);

    const refreshControl = usePullToRefresh(() =>
        Promise.all([
            match.refetch(),
            myPredictions.refetch(),
            distributions.refetch(),
            myLeagues.refetch(),
            leaguePredictions.refetch(),
            leagueBoard.refetch(),
        ]),
    );

    const currentMatch = match.data;
    const prediction = currentMatch ? myPredictions.data?.get(currentMatch.id) : undefined;
    const distribution = currentMatch ? distributions.data?.get(currentMatch.id) : undefined;
    const boardEntries = markTies(leagueBoard.data ?? []);

    // Ouvert par notification ou deep link, l'écran n'a pas de pile derrière
    // lui : repli sur l'accueil plutôt qu'un GO_BACK dans le vide.
    const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

    // Le hero n'est plus épinglé : il est le contenu déplié du CollapsingHeader
    // et se réduit au scroll jusqu'à la barre compacte (équipes + score).
    return (
        <View className="flex-1 bg-bg">
            <Screen
                contentClassName="gap-5 px-6 pb-8"
                contentContainerStyle={{ paddingTop: headerHeight }}
                onScroll={onScroll}
                refreshControl={refreshControl}
                top="none">
                {match.isPending ? (
                    <View className="gap-3 pt-3">
                        <Skeleton className="h-52" variant="block" />
                        <Skeleton className="h-14" variant="block" />
                        <Skeleton className="h-14" variant="block" />
                    </View>
                ) : match.isError ? (
                    <View className="items-center justify-center py-16">
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
                ) : !currentMatch ? (
                    <View className="items-center justify-center py-16">
                        <EmptyState title={t('matches:detail.notFound')} />
                    </View>
                ) : (
                    <>
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
                                <LockedPredictionCard
                                    match={currentMatch}
                                    prediction={prediction}
                                />
                            )}
                            {/* Lien discret vers le référentiel des règles — texte faint,
                    jamais de grenat (réservé CTA/live/sélection) */}
                            <Pressable
                                accessibilityRole="button"
                                className="flex-row items-center justify-center gap-1.5"
                                hitSlop={8}
                                onPress={() => router.push('/rules')}>
                                <CircleHelp color={textFaintColor} size={14} strokeWidth={1.9} />
                                <Text className="font-body-medium text-[12px] text-text-muted">
                                    {t('scoring:rules.link')}
                                </Text>
                            </Pressable>
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
                                        accessibilityLabel={t(
                                            'leagues:leaderboard.select.overline',
                                        )}
                                        icon={
                                            <Users
                                                color={accentColor}
                                                size={18}
                                                strokeWidth={1.9}
                                            />
                                        }
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
                                                    onPress={openPlayerProfile(entry.user_id)}
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
                                                onPress={openPlayerProfile(entry.user_id)}
                                                tie={entry.tie}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}
            </Screen>

            {/* Rendu même en chargement/erreur : sans header natif, c'est le
                seul bouton retour de l'écran. */}
            <CollapsingHeader
                compactTitle={
                    currentMatch ? (
                        <Text className="font-body-bold text-[15px] text-text" numberOfLines={1}>
                            {compactMatchLabel(currentMatch)}
                        </Text>
                    ) : null
                }
                expanded={currentMatch ? <MatchHero match={currentMatch} /> : null}
                onBack={goBack}
                onHeightChange={setHeaderHeight}
                scrollY={scrollY}
            />
        </View>
    );
}
