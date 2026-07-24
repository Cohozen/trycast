import { useRouter } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePullToRefresh } from '@/components/ui/use-pull-to-refresh';
import { DayStrip } from '@/features/matches/components/day-strip';
import { buildDayRange, dayKeyOf, MATCH_DAYS_ONLY, stepDayKey } from '@/features/matches/day-range';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { ResultCard } from '@/features/predictions/components/result-card';
import { splitMatches } from '@/features/predictions/split-matches';
import { useCommunityDistributions } from '@/features/predictions/use-community-distributions';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { hapticLight } from '@/lib/haptics';
import { i18n } from '@/lib/i18n';
import { ScrollView, Text, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

// Balayage horizontal de la liste : distance (px) ou vitesse (px/s) minimale
// pour valider un changement de jour, sous les seuils on annule.
const SWIPE_DISTANCE = 48;
const SWIPE_VELOCITY = 500;

export default function ResultsScreen() {
    const { t } = useTranslation(['matches', 'predictions', 'common']);
    const router = useRouter();
    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);
    const predictions = useMyPredictions(competition.data?.id);
    const distributions = useCommunityDistributions(competition.data?.id);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    // Sélection différée : au clic, la bande se met à jour tout de suite
    // (currentDay), pendant que la liste — lourde à re-monter — se recalcule en
    // tâche interruptible via listDay, sans geler le tap.
    const deferredSelectedDay = useDeferredValue(selectedDay);
    const screenInsets = useScreenInsets();

    const refreshControl = usePullToRefresh(() =>
        Promise.all([
            competition.refetch(),
            matches.refetch(),
            predictions.refetch(),
            distributions.refetch(),
        ]),
    );

    if (
        competition.isPending ||
        (competition.data && (matches.isPending || predictions.isPending))
    ) {
        return (
            <View
                className="flex-1 gap-3 bg-bg px-5"
                style={{
                    paddingTop: screenInsets.top,
                    paddingBottom: screenInsets.bottomTabBar,
                }}>
                <Skeleton className="h-9 w-44" variant="block" />
                <Skeleton className="h-18.5" variant="block" />
                <Skeleton className="h-52" variant="block" />
                <Skeleton className="h-52" variant="block" />
            </View>
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
                    title={t('matches:errors.loadResults')}
                />
            </View>
        );
    }

    const results = matches.data ? splitMatches(matches.data, new Date()).results : [];
    const fullRange = competition.data
        ? buildDayRange({
              startsOn: competition.data.starts_on,
              endsOn: competition.data.ends_on,
              matchDayKeys: new Set(results.map((match) => dayKeyOf(match.kickoff_at))),
          })
        : [];
    // Par défaut on n'expose que les jours avec des matchs (cf. MATCH_DAYS_ONLY).
    const days = MATCH_DAYS_ONLY ? fullRange.filter((day) => day.hasMatches) : fullRange;
    // La plage s'arrête à aujourd'hui : le dernier jour avec matchs est donc
    // le plus proche de la date courante — c'est lui qu'on présélectionne.
    const defaultDay = days.findLast((day) => day.hasMatches)?.key ?? null;
    // currentDay = valeur urgente (bande, feedback instantané au tap).
    const currentDay = selectedDay ?? defaultDay;
    // listDay = valeur différée (filtrage de la liste). Tant qu'elle n'a pas
    // rattrapé currentDay, on estompe la liste pour signaler la transition.
    const listDay = deferredSelectedDay ?? defaultDay;
    const isDayPending = listDay !== currentDay;
    const dayResults = results.filter((m) => dayKeyOf(m.kickoff_at) === listDay);
    const dayTitle =
        dayResults.length > 0
            ? new Intl.DateTimeFormat(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
              }).format(new Date(dayResults[0].kickoff_at))
            : '';

    // Passe au jour de match voisin (en sautant les jours vides). currentDay
    // pilote la bande, la mise à jour de selectedDay est reprise par listDay.
    const goToAdjacentDay = (direction: 1 | -1) => {
        const nextDay = stepDayKey(days, currentDay, direction);
        if (nextDay === null) return;
        setSelectedDay(nextDay);
        hapticLight();
    };

    // Geste horizontal sur la liste : gauche → jour plus récent (droite de la
    // bande), droite → plus ancien. Les offsets laissent le scroll vertical
    // primer (activation seulement après un franc mouvement horizontal).
    const swipeDays = Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-18, 18])
        .onEnd((event) => {
            if (event.translationX <= -SWIPE_DISTANCE || event.velocityX <= -SWIPE_VELOCITY) {
                runOnJS(goToAdjacentDay)(1);
            } else if (event.translationX >= SWIPE_DISTANCE || event.velocityX >= SWIPE_VELOCITY) {
                runOnJS(goToAdjacentDay)(-1);
            }
        });

    return (
        <View className="flex-1 bg-bg">
            <View className="flex-none px-5 pb-1" style={{ paddingTop: screenInsets.top }}>
                <View className="gap-1">
                    <Text className="font-display text-3xl leading-7.5 tracking-[0.3px] text-text">
                        {t('matches:results.title')}
                    </Text>
                    {competition.data ? (
                        <Text className="font-body text-[13px] text-text-muted">
                            {competition.data.name}
                        </Text>
                    ) : null}
                </View>
            </View>

            {results.length === 0 ? (
                <View className="flex-1 items-center justify-center p-6">
                    <EmptyState
                        message={t('matches:results.empty.message')}
                        title={t('matches:results.empty.title')}
                    />
                </View>
            ) : (
                <>
                    {days.length > 0 ? (
                        <DayStrip
                            days={days}
                            onSelect={setSelectedDay}
                            selected={currentDay ?? ''}
                        />
                    ) : null}
                    <GestureDetector gesture={swipeDays}>
                        <RNView style={{ flex: 1 }}>
                            <ScrollView
                                className="flex-1"
                                contentContainerClassName="w-full max-w-[800px] gap-3 self-center px-5 pt-4"
                                contentContainerStyle={{
                                    paddingBottom: screenInsets.bottomTabBar,
                                }}
                                refreshControl={refreshControl}
                                style={{ opacity: isDayPending ? 0.5 : 1 }}>
                                <View className="flex-row items-baseline justify-between gap-3 px-0.5">
                                    <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                                        {dayTitle}
                                    </Text>
                                    <Text className="font-body-bold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                                        {t('matches:results.count', { count: dayResults.length })}
                                    </Text>
                                </View>
                                {dayResults.map((match) => (
                                    <ResultCard
                                        distribution={distributions.data?.get(match.id)}
                                        key={match.id}
                                        match={match}
                                        onOpenMatch={() =>
                                            router.push({
                                                pathname: '/match/[id]',
                                                params: { id: match.id },
                                            })
                                        }
                                        prediction={predictions.data?.get(match.id)}
                                    />
                                ))}
                            </ScrollView>
                        </RNView>
                    </GestureDetector>
                </>
            )}
        </View>
    );
}
