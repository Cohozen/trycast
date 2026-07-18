import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { usePullToRefresh } from '@/components/ui/use-pull-to-refresh';
import { useSession } from '@/features/auth/session-context';
import { useGlobalLeaderboard } from '@/features/leagues/use-global-leaderboard';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useMyStanding } from '@/features/leagues/use-my-standing';
import { LiveMatchCard } from '@/features/matches/components/live-match-card';
import type { MatchWithTeams } from '@/features/matches/types';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useLiveMatches } from '@/features/matches/use-live-matches';
import { useMatches } from '@/features/matches/use-matches';
import { PredictionCard } from '@/features/predictions/components/prediction-card';
import { splitMatches } from '@/features/predictions/split-matches';
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
    const myLeagues = useMyLeagues();
    const standing = useMyStanding(competition.data?.id, userId);
    const leaderboard = useGlobalLeaderboard(competition.data?.id);
    const screenInsets = useScreenInsets();

    const refreshControl = usePullToRefresh(() =>
        Promise.all([
            matches.refetch(),
            liveMatches.refetch(),
            predictions.refetch(),
            distributions.refetch(),
            standing.refetch(),
            leaderboard.refetch(),
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
    const hasLeagues = (myLeagues.data?.length ?? 0) > 0;
    const myRank = leaderboard.data?.find((row) => row.user_id === userId)?.rank ?? null;
    const totalPoints = standing.data?.total_points ?? 0;
    const played = standing.data?.predictions_scored ?? 0;
    const currentRound = upcoming[0]?.round ?? null;

    // Contenu défilant aplati : stickyHeaderIndices exige que les en-têtes de
    // date soient des enfants directs du ScrollView.
    const listChildren: ReactNode[] = [];
    const stickyIndices: number[] = [];

    // Carte(s) LIVE en tête (vide tant que sync-live n'est pas activé),
    // pressables vers la page de détail — seule entrée du lot (décision
    // 2026-07-13), surface read-only sans risque de mis-tap.
    for (const match of liveMatches.data ?? []) {
        listChildren.push(
            <Pressable
                accessibilityRole="button"
                key={`live-${match.id}`}
                onPress={() => router.push({ pathname: '/match/[id]', params: { id: match.id } })}>
                <LiveMatchCard match={match} prediction={predictions.data?.get(match.id)} />
            </Pressable>,
        );
    }

    if (hasLeagues) {
        listChildren.push(
            // Actions de ligue
            <View className="flex-row gap-2.5" key="league-actions">
                <View className="flex-1">
                    <Button
                        fullWidth
                        onPress={() => router.push('/league/new')}
                        title={t('leagues:actions.create')}
                        variant="secondary"
                    />
                </View>
                <View className="flex-1">
                    <Button
                        fullWidth
                        onPress={() =>
                            router.push({ pathname: '/league/new', params: { tab: 'join' } })
                        }
                        title={t('leagues:actions.join')}
                        variant="ghost"
                    />
                </View>
            </View>,
        );
    } else {
        listChildren.push(
            // Aucune ligue : les CTA deviennent le héros
            <View className="items-center gap-3.5 px-5 pb-1 pt-6" key="league-hero">
                <BrandMark size={72} />
                <Text className="text-center font-display text-h2 text-text">
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
                listChildren.push(
                    <PredictionCard
                        distribution={distributions.data?.get(match.id)}
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
            {/* Bloc épinglé : en-tête + mini-dashboard */}
            <View
                className="w-full max-w-200 flex-none gap-4.5 self-center px-5 pb-1"
                style={{ paddingTop: screenInsets.top }}>
                {/* En-tête : compétition + journée */}
                <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1.5">
                        <Text className="font-body-bold text-[11px] uppercase tracking-[1.54px] text-text-faint">
                            {t('matches:header.overline')}
                        </Text>
                        <Text className="font-display text-[27px] leading-7 tracking-[0.27px] text-text">
                            {competition.data.name}
                        </Text>
                    </View>
                    {currentRound ? (
                        <View className="mt-5 h-6 justify-center rounded-pill border border-border bg-surface-sunken px-2.5">
                            <Text className="font-body-bold text-[11px] uppercase tracking-[0.44px] text-text-muted">
                                {t('matches:results.number_day_short', { count: currentRound })}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Mini-dashboard */}
                {hasLeagues ? (
                    <View className="flex-row items-stretch justify-between gap-4 rounded-md border border-border bg-surface p-4.5 tc-shadow-sm">
                        <View className="gap-0.5">
                            <View className="flex-row items-center gap-1.5">
                                <View className="h-1.75 w-1.75 rounded-pill bg-accent" />
                                <Text className="font-body-bold text-[11px] uppercase tracking-[1.1px] text-text-faint">
                                    {t('predictions:dashboard.points')}
                                </Text>
                            </View>
                            <Text className="font-display text-[52px] leading-12.5 text-text">
                                {totalPoints}
                            </Text>
                        </View>
                        <View className="w-px bg-border" />
                        <View className="min-w-29 justify-center gap-3.5">
                            <View className="gap-px">
                                <Text className="font-display text-[22px] leading-5.5 text-text">
                                    {played}
                                </Text>
                                <Text className="font-body text-[12px] text-text-muted">
                                    {t('predictions:dashboard.played')}
                                </Text>
                            </View>
                            {myRank !== null ? (
                                <View className="gap-px">
                                    <Text className="font-display text-[22px] leading-5.5 text-text">
                                        {myRank === 1 ? '1ᵉʳ' : `${myRank}ᵉ`}
                                    </Text>
                                    <Text className="font-body text-[12px] text-text-muted">
                                        {t('predictions:dashboard.globalRank')}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                ) : null}
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
