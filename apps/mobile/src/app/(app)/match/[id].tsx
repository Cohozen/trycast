import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CircleHelp, Users } from 'lucide-react-native';
import { useDeferredValue, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View as RNView } from 'react-native';
import Animated, { scrollTo, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { CollapsingHeaderTitle } from '@/components/collapsing-header-title';
import { HeaderHairline } from '@/components/header-hairline';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { usePullToRefresh } from '@/components/ui/use-pull-to-refresh';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { markTies } from '@/features/leagues/ranking';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { CompactScore } from '@/features/matches/components/compact-score';
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
import { useMyJokers } from '@/features/jokers/use-my-jokers';
import { useOpenPlayerProfile } from '@/features/profile/use-open-player-profile';
import { ReactionsSheet } from '@/features/reactions/components/reactions-sheet';
import { toReactionMessageKey } from '@/features/reactions/errors';
import { parseReactionCounts } from '@/features/reactions/reactions';
import type { ReactionsTarget } from '@/features/reactions/types';
import { useSetReaction } from '@/features/reactions/use-set-reaction';
import { useCollapseProgress } from '@/components/use-collapse-progress';
import { Pressable, Text, useThemeColor, View } from '@/tw';

type LeagueView = 'predictions' | 'leaderboard';

/**
 * Page de détail d'un match (maquette Match Detail, sans la timeline —
 * retirée du MVP faute de données) : hero score/live/coup d'envoi, mon prono
 * selon la phase (éditable / verrouillé / réconcilié) et les pronos +
 * classement de mes ligues. La liste des pronos des autres n'apparaît
 * qu'après le kickoff (garanti serveur par la RPC, le client n'est qu'une UX).
 */
export default function MatchScreen() {
    const { t } = useTranslation([
        'matches',
        'predictions',
        'leagues',
        'scoring',
        'reactions',
        'common',
    ]);
    // league/member : ouverture depuis la carte du coup de la journée, sur la
    // ligne du lauréat (là où vit sa barre de réaction)
    const {
        id,
        league: leagueParam,
        member: memberParam,
    } = useLocalSearchParams<{ id: string; league?: string; member?: string }>();
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
    const myJokers = useMyJokers(competitionId);
    const distributions = useCommunityDistributions(competitionId);
    const myLeagues = useMyLeagues();

    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(leagueParam ?? null);
    // Contour bref de la ligne visée, allumé quand elle est mesurée
    const [focusing, setFocusing] = useState(false);
    const [view, setView] = useState<LeagueView>('predictions');
    // La pastille suit `view` (bascule immédiate au tap) ; le sélecteur de
    // contenu (liste des pronos ↔ classement de la ligue) est piloté par la
    // valeur différée pour ne pas bloquer le tap. Les requêtes s'activent tout
    // de suite sur `view`.
    const deferredView = useDeferredValue(view);

    const leagues = myLeagues.data ?? [];
    const currentLeagueId = selectedLeagueId ?? leagues[0]?.id;
    const currentLeague = leagues.find((league) => league.id === currentLeagueId);

    const leaguePredictions = useMatchLeaguePredictions(
        id,
        view === 'predictions' ? currentLeagueId : undefined,
        kickoffPassed,
    );
    const leagueBoard = useLeagueLeaderboard(view === 'leaderboard' ? currentLeagueId : undefined);
    const setReaction = useSetReaction(currentLeagueId, id);
    const toast = useToast();
    // Prono dont la sheet des réactions est ouverte (une seule sheet pour la liste)
    const [reactionsTarget, setReactionsTarget] = useState<ReactionsTarget | null>(null);

    // Header repliable (DS 2026-09-21) : le hero s'estompe entre 20 et 110 px
    // de défilement, le score compact prend place dans la barre native.
    const collapse = useCollapseProgress({ start: 20, distance: 90 });
    // Défilement jusqu'à la ligne du lauréat, une seule fois : sa position se
    // mesure dans la fenêtre, relativement au hero (en haut du contenu)
    const heroRef = useRef<RNView>(null);
    const focusedFor = useRef<string | undefined>(undefined);
    const scrollRef = collapse.scrollRef;
    const focusRow = (row: RNView | null) => {
        if (!row || !memberParam || focusedFor.current === memberParam) return;
        focusedFor.current = memberParam;
        // Données en cache : la ligne se pose pendant l'animation d'entrée de
        // l'écran, où le défilement est ignoré. ponytail: délai fixe calé sur
        // la transition native, un listener transitionEnd si ça ne suffit pas
        setTimeout(() => {
            heroRef.current?.measureInWindow((_heroX, heroY) => {
                row.measureInWindow((_x, rowY) => {
                    const target = Math.max(0, rowY - heroY - 24);
                    scheduleOnUI(() => {
                        'worklet';
                        scrollTo(scrollRef, 0, target, true);
                    });
                });
            });
            setFocusing(true);
            setTimeout(() => setFocusing(false), 2400);
        }, 450);
    };
    const heroStyle = useAnimatedStyle(() => ({
        opacity: 1 - collapse.progress.value * 0.92,
        transform: [{ scale: 1 - collapse.progress.value * 0.05 }],
    }));

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

    const reactionsEntry = leaguePredictions.data?.find(
        (entry) => entry.user_id === reactionsTarget?.userId,
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitleAlign: 'center',
                    headerTitle: () => (
                        <CollapsingHeaderTitle
                            compact={<CompactScore match={currentMatch} />}
                            progress={collapse.progress}
                            title={t('matches:detail.screenTitle')}
                        />
                    ),
                }}
            />
            <HeaderHairline progress={collapse.progress} />
            <Screen
                contentClassName="gap-5 px-6"
                contentContainerStyle={{ minHeight: collapse.minContentHeight }}
                onLayout={collapse.onLayout}
                scrollRef={collapse.scrollRef}
                refreshControl={refreshControl}
                top="none">
                {/* Vue hôte : repère mesurable du haut du contenu (focusRow) */}
                <RNView collapsable={false} ref={heroRef}>
                    <Animated.View style={[{ transformOrigin: 'top' }, heroStyle]}>
                        <MatchHero match={currentMatch} />
                    </Animated.View>
                </RNView>

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
                            jokerOn={[...(myJokers.data?.values() ?? [])].some(
                                (joker) => joker.matchId === currentMatch.id,
                            )}
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

                        {deferredView === 'predictions' ? (
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
                                        <RNView
                                            collapsable={false}
                                            key={entry.user_id}
                                            onLayout={
                                                entry.user_id === memberParam
                                                    ? (event) =>
                                                          focusRow(
                                                              event.currentTarget as unknown as RNView,
                                                          )
                                                    : undefined
                                            }>
                                            <MemberPredictionRow
                                                entry={entry}
                                                highlighted={
                                                    focusing && entry.user_id === memberParam
                                                }
                                                isMe={entry.user_id === userId}
                                                match={currentMatch}
                                                onOpenReactions={() =>
                                                    setReactionsTarget({
                                                        userId: entry.user_id,
                                                        username: entry.username,
                                                    })
                                                }
                                                onPress={openPlayerProfile(entry.user_id)}
                                                onReact={(next) =>
                                                    setReaction.mutate(
                                                        { targetUserId: entry.user_id, next },
                                                        {
                                                            onError: (error) =>
                                                                toast.show(
                                                                    t(toReactionMessageKey(error)),
                                                                    'neutral',
                                                                ),
                                                        },
                                                    )
                                                }
                                            />
                                        </RNView>
                                    ))}
                                    <Text className="mt-1.5 text-center font-body text-[11px] text-text-faint">
                                        {t('reactions:footer')}
                                    </Text>
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
            </Screen>
            <ReactionsSheet
                counts={parseReactionCounts(reactionsEntry?.reactions)}
                leagueId={currentLeagueId}
                matchId={id}
                onClose={() => setReactionsTarget(null)}
                target={reactionsTarget}
                userId={userId}
            />
        </>
    );
}
