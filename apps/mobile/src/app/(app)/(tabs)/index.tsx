import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/brand-mark';
import { HeaderActions } from '@/components/header-actions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { usePullToRefresh } from '@/components/ui/use-pull-to-refresh';
import { useSession } from '@/features/auth/session-context';
import { LeagueActionsCard } from '@/features/leagues/components/league-actions-card';
import { MyPointsCard } from '@/features/leagues/components/my-points-card';
import { summarizeRound } from '@/features/leagues/round-summary';
import { useCompetitionStages } from '@/features/leagues/use-competition-stages';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useMyPreviousRank } from '@/features/leagues/use-my-previous-rank';
import { useMyRank } from '@/features/leagues/use-my-rank';
import { useMyStanding } from '@/features/leagues/use-my-standing';
import { LiveDot } from '@/features/matches/components/live-dot';
import { LiveMatchCard } from '@/features/matches/components/live-match-card';
import type { MatchWithTeams } from '@/features/matches/types';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useLiveMatches } from '@/features/matches/use-live-matches';
import { useMatches } from '@/features/matches/use-matches';
import { PredictionCard } from '@/features/predictions/components/prediction-card';
import { splitMatches } from '@/features/predictions/split-matches';
import { findCompetitionPhase, jokerCardState } from '@/features/jokers/find-competition-phase';
import { useCompetitionPhases } from '@/features/jokers/use-competition-phases';
import type { JokersByPhase } from '@/features/jokers/types';
import { useMyJokers } from '@/features/jokers/use-my-jokers';
import { useCommunityDistributions } from '@/features/predictions/use-community-distributions';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { i18n } from '@/lib/i18n';
import { Pressable, Text, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

type DateGroup = { key: string; label: string; round: string | null; matches: MatchWithTeams[] };

type RelativeDateKey = 'matches:dates.today' | 'matches:dates.tomorrow';

/** Groupe les matchs à venir par jour local (libellés Aujourd'hui/Demain + date). */
function groupByDate(matches: MatchWithTeams[], t: (key: RelativeDateKey) => string): DateGroup[] {
    const formatter = new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
    const dayKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const groups: DateGroup[] = [];
    for (const match of matches) {
        const kickoff = new Date(match.kickoff_at);
        const key = dayKey(kickoff);
        let group = groups.at(-1);
        if (!group || group.key !== key) {
            const relative =
                key === dayKey(today)
                    ? `${t('matches:dates.today')} · `
                    : key === dayKey(tomorrow)
                      ? `${t('matches:dates.tomorrow')} · `
                      : '';
            group = {
                key,
                label: relative + formatter.format(kickoff),
                round: match.round,
                matches: [],
            };
            groups.push(group);
        }
        group.matches.push(match);
    }
    return groups;
}

export default function MatchesScreen() {
    const { t } = useTranslation(['matches', 'predictions', 'leagues', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id;

    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);
    const liveMatches = useLiveMatches(competition.data?.id);
    const predictions = useMyPredictions(competition.data?.id);
    const distributions = useCommunityDistributions(competition.data?.id);
    const phases = useCompetitionPhases(competition.data?.id);
    const jokers = useMyJokers(competition.data?.id);
    const myLeagues = useMyLeagues();
    const standing = useMyStanding(competition.data?.id, userId);
    const myRank = useMyRank(competition.data?.id, standing.data);
    const stages = useCompetitionStages(competition.data?.id);
    const summary =
        matches.data && predictions.data
            ? summarizeRound(matches.data, predictions.data, stages.data ?? [], new Date())
            : null;
    const previousRank = useMyPreviousRank(competition.data?.id, summary?.round?.firstKickoff);
    const screenInsets = useScreenInsets();

    const refreshControl = usePullToRefresh(() =>
        Promise.all([
            matches.refetch(),
            liveMatches.refetch(),
            predictions.refetch(),
            distributions.refetch(),
            jokers.refetch(),
            standing.refetch(),
            myRank.refetch(),
            previousRank.refetch(),
            myLeagues.refetch(),
        ]),
    );

    const loading =
        !userId ||
        competition.isPending ||
        (competition.data && (matches.isPending || predictions.isPending || myLeagues.isPending));

    if (loading) {
        return (
            <Screen bottom="tabBar" contentClassName="gap-[18px]">
                <Skeleton className="h-24" variant="block" />
                <View className="flex-row gap-2.5">
                    <Skeleton className="h-12 flex-1" variant="block" />
                    <Skeleton className="h-12 flex-1" variant="block" />
                </View>
                <Skeleton className="w-36" variant="line" />
                <Skeleton className="h-56" variant="block" />
                <Skeleton className="h-56" variant="block" />
            </Screen>
        );
    }

    if (competition.isError || matches.isError || predictions.isError) {
        return (
            <View className="flex-1 items-center justify-center bg-bg p-6">
                <EmptyState
                    action={
                        <Button
                            onPress={() => {
                                void competition.refetch();
                                void matches.refetch();
                                void predictions.refetch();
                            }}
                            title={t('common:actions.retry')}
                            variant="secondary"
                        />
                    }
                    title={t('matches:errors.load')}
                />
            </View>
        );
    }

    if (!competition.data || !matches.data) {
        return (
            <View className="flex-1 items-center justify-center bg-bg p-6">
                <EmptyState
                    message={t('matches:empty.noCompetition')}
                    title={t('matches:empty.title')}
                />
            </View>
        );
    }

    const { upcoming } = splitMatches(matches.data, new Date());
    const groups = groupByDate(upcoming, t);
    const toPredict = upcoming.filter((m) => !predictions.data?.get(m.id)).length;

    const jokerMap: JokersByPhase = jokers.data ?? new Map();
    const hasLeagues = (myLeagues.data?.length ?? 0) > 0;

    // Contenu défilant aplati : stickyHeaderIndices exige que les en-têtes de
    // date soient des enfants directs du ScrollView.
    const listChildren: ReactNode[] = [];
    const stickyIndices: number[] = [];

    // Carte « Tes points » : premier bloc du scroll, elle disparaît en
    // défilant — seul le titre reste épinglé en haut.
    if (hasLeagues && summary) {
        listChildren.push(
            <MyPointsCard
                gapToAbove={myRank.data?.gapToAbove ?? null}
                key="dashboard"
                // Échec de la RPC (migration pas encore en prod) : la carte
                // retombe sur l'écart avec le joueur du dessus
                previousRank={previousRank.data ?? null}
                rank={myRank.data?.rank ?? null}
                summary={summary}
                totalPoints={standing.data?.total_points ?? 0}
            />,
        );
    }

    if (hasLeagues) {
        listChildren.push(<LeagueActionsCard key="league-actions" />);
    } else {
        listChildren.push(
            // Aucune ligue : les CTA deviennent le héros
            <View className="items-center gap-3.5 px-5 pb-1 pt-6" key="league-hero">
                <BrandMark size={72} />
                {/* leading-[26px] : le ratio 1.09 du token h2 (24px) est trop
                    serré pour les ascendantes d'Anton, qui se font rogner en
                    natif — même parade que text-h1 / leading-[38px] */}
                <Text className="text-center font-display text-h2 leading-[26px] text-text">
                    {t('leagues:hero.title')}
                </Text>
                <Text className="max-w-70 text-center font-body text-[14px] leading-5.25 text-text-muted">
                    {t('leagues:hero.message')}
                </Text>
                <View className="mt-2 w-full max-w-75 gap-2.5">
                    <Button
                        fullWidth
                        onPress={() => router.push('/league/new')}
                        size="lg"
                        title={t('leagues:actions.create')}
                    />
                    <Button
                        fullWidth
                        onPress={() =>
                            router.push({ pathname: '/league/new', params: { tab: 'join' } })
                        }
                        size="lg"
                        title={t('leagues:actions.join')}
                        variant="secondary"
                    />
                </View>
                <Text className="mt-1.5 font-body text-[13px] text-text-faint">
                    {t('leagues:hero.footnote')}
                </Text>
            </View>,
        );
    }

    if (toPredict > 0) {
        listChildren.push(
            // Compteur à pronostiquer
            <View
                className="flex-row items-center gap-3 rounded-md border border-accent/25 bg-accent/10 px-3.5 py-3"
                key="to-predict">
                <Text className="font-display text-[30px] leading-7 text-accent">{toPredict}</Text>
                <View className="gap-px">
                    <Text className="font-body-bold text-[14px] text-text">
                        {t('predictions:toPredict.label', { count: toPredict })}
                    </Text>
                    <Text className="font-body text-[12px] text-text-muted">
                        {t('predictions:toPredict.autoSave')}
                    </Text>
                </View>
            </View>,
        );
    }

    // Matchs en cours, entre le compteur et les matchs à venir (DS
    // 2026-09-23), pressables vers la page de détail — surface read-only
    // sans risque de mis-tap.
    const live = liveMatches.data ?? [];
    if (live.length > 0) {
        listChildren.push(
            <View className="flex-row items-center gap-2 px-1 py-0.5" key="live-header">
                <LiveDot />
                <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                    {t('matches:status.inPlay')}
                </Text>
            </View>,
        );
    }
    for (const match of live) {
        listChildren.push(
            <Pressable
                accessibilityRole="button"
                key={`live-${match.id}`}
                onPress={() => router.push({ pathname: '/match/[id]', params: { id: match.id } })}>
                <LiveMatchCard
                    jokerOn={[...jokerMap.values()].some((joker) => joker.matchId === match.id)}
                    match={match}
                    prediction={predictions.data?.get(match.id)}
                />
            </Pressable>,
        );
    }

    // Matchs à venir groupés par date ; chaque en-tête de jour est sticky
    // jusqu'à être poussé par le suivant (fond opaque bg-bg obligatoire).
    if (upcoming.length === 0) {
        listChildren.push(
            <View className="rounded-lg border border-dashed border-border-strong p-3" key="empty">
                <EmptyState message={t('matches:empty.message')} title={t('matches:empty.title')} />
            </View>,
        );
    } else {
        for (const group of groups) {
            stickyIndices.push(listChildren.length);
            listChildren.push(
                <View className="bg-bg py-1.5" key={group.key}>
                    <View className="flex-row items-baseline justify-between gap-3">
                        <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                            {group.label}
                        </Text>
                        {group.round ? (
                            <Text className="font-body-bold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                                {t('matches:results.number_day', { count: group.round })}
                            </Text>
                        ) : null}
                    </View>
                </View>,
            );
            for (const match of group.matches) {
                const phase = findCompetitionPhase(phases.data ?? [], match.kickoff_at);
                const jokerState = jokerCardState(match.id, phase, jokerMap);
                listChildren.push(
                    <PredictionCard
                        distribution={distributions.data?.get(match.id)}
                        joker={
                            phase && jokerState !== 'none'
                                ? { phaseId: phase.id, state: jokerState }
                                : undefined
                        }
                        key={match.id}
                        match={match}
                        prediction={predictions.data?.get(match.id)}
                        userId={userId}
                    />,
                );
            }
        }
    }

    return (
        <View className="flex-1 bg-bg">
            {/* Bloc épinglé : nom de la compétition (seul élément permanent en haut) */}
            <View
                className="w-full max-w-200 flex-none flex-row items-start gap-3 self-center px-5 pb-1"
                style={{ paddingTop: screenInsets.top }}>
                <View className="min-w-0 flex-1 gap-1.5">
                    <Text className="font-body-bold text-[11px] uppercase tracking-[1.54px] text-text-faint">
                        {t('matches:header.overline')}
                    </Text>
                    <Text className="font-display text-[27px] leading-7 tracking-[0.27px] text-text">
                        {competition.data.name}
                    </Text>
                </View>
                <HeaderActions />
            </View>

            {/* Le scroll des pronos porte les inputs de score : Screen gère le
                clavier (suivi iOS, taps actifs clavier ouvert) et le dégagement
                de la tab bar ; le bloc épinglé au-dessus gère déjà le haut. */}
            <Screen
                bottom="tabBar"
                contentClassName="gap-3 pt-3"
                refreshControl={refreshControl}
                stickyHeaderIndices={stickyIndices}
                top="none">
                {listChildren}
            </Screen>
        </View>
    );
}
