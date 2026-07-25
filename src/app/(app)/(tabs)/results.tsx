import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    type FlatList,
    type ListRenderItemInfo,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { NotificationsBell } from '@/components/notifications-bell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DayStrip } from '@/features/matches/components/day-strip';
import {
    buildDayRange,
    dayKeyOf,
    MATCH_DAYS_ONLY,
    type StripDay,
} from '@/features/matches/day-range';
import type { MatchWithTeams } from '@/features/matches/types';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { ResultsDayPage } from '@/features/predictions/components/results-day-page';
import { splitMatches } from '@/features/predictions/split-matches';
import { useCommunityDistributions } from '@/features/predictions/use-community-distributions';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { hapticLight } from '@/lib/haptics';
import { Text, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

export default function ResultsScreen() {
    const { t } = useTranslation(['matches', 'predictions', 'common']);
    const router = useRouter();
    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);
    const predictions = useMyPredictions(competition.data?.id);
    const distributions = useCommunityDistributions(competition.data?.id);
    const screenInsets = useScreenInsets();
    const { width } = useWindowDimensions();

    // Décalage du carrousel partagé avec la bande (index fractionnaire côté strip).
    const scrollX = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
    });
    const flatListRef = useRef<FlatList<StripDay>>(null);
    // Jour courant (index de page) — en ref pour un tick haptique à chaque arrivée
    // sur un nouveau jour, sans déclencher de re-render.
    const currentIndexRef = useRef(-1);

    const onRefresh = () =>
        Promise.all([
            competition.refetch(),
            matches.refetch(),
            predictions.refetch(),
            distributions.refetch(),
        ]);

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

    // Résultats groupés par jour : chaque page du carrousel lit sa liste.
    const resultsByDay = new Map<string, MatchWithTeams[]>();
    for (const match of results) {
        const key = dayKeyOf(match.kickoff_at);
        const bucket = resultsByDay.get(key);
        if (bucket) bucket.push(match);
        else resultsByDay.set(key, [match]);
    }

    // Jour présélectionné = le dernier à matchs (le plus proche d'aujourd'hui).
    let initialIndex = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].hasMatches) {
            initialIndex = i;
            break;
        }
    }

    // Amorce la ref au montage (événement : interdit d'écrire une ref au rendu)
    // pour qu'aucun tick haptique ne parte sur la position initiale.
    const onListLayout = () => {
        if (currentIndexRef.current === -1) currentIndexRef.current = initialIndex;
    };

    const onSelectDay = (index: number) => {
        const delta = Math.abs(index - currentIndexRef.current);
        if (delta === 0) return;
        // Voisin : on garde le glissé. Jour lointain : saut instantané — un
        // scroll animé ferait défiler (et monter/démonter) toutes les pages
        // intermédiaires. Sans animation, la FlatList ne rend que la cible.
        const animated = delta === 1;
        if (!animated) {
            // Pas de momentum sur un saut instantané : on avance la ref et le
            // tick haptique ici (sinon onMomentumEnd s'en charge).
            currentIndexRef.current = index;
            hapticLight();
        }
        flatListRef.current?.scrollToOffset({ offset: index * width, animated });
    };

    const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        if (index !== currentIndexRef.current) {
            currentIndexRef.current = index;
            hapticLight();
        }
    };

    const renderItem = ({ item }: ListRenderItemInfo<StripDay>) => (
        <ResultsDayPage
            distributions={distributions.data}
            matches={resultsByDay.get(item.key) ?? []}
            onOpenMatch={(id) => router.push({ pathname: '/match/[id]', params: { id } })}
            onRefresh={onRefresh}
            predictions={predictions.data}
            width={width}
        />
    );

    return (
        <View className="flex-1 bg-bg">
            <View
                className="flex-none flex-row items-start gap-3 px-5 pb-1"
                style={{ paddingTop: screenInsets.top }}>
                <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-display text-3xl leading-7.5 tracking-[0.3px] text-text">
                        {t('matches:results.title')}
                    </Text>
                    {competition.data ? (
                        <Text className="font-body text-[13px] text-text-muted">
                            {competition.data.name}
                        </Text>
                    ) : null}
                </View>
                <NotificationsBell />
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
                            onSelect={onSelectDay}
                            pageWidth={width}
                            scrollX={scrollX}
                        />
                    ) : null}
                    <Animated.FlatList
                        bounces={false}
                        data={days}
                        getItemLayout={(_, index) => ({
                            length: width,
                            offset: width * index,
                            index,
                        })}
                        horizontal
                        initialScrollIndex={initialIndex}
                        keyExtractor={(day: StripDay) => day.key}
                        onLayout={onListLayout}
                        onMomentumScrollEnd={onMomentumEnd}
                        onScroll={onScroll}
                        pagingEnabled
                        ref={flatListRef}
                        renderItem={renderItem}
                        scrollEventThrottle={16}
                        showsHorizontalScrollIndicator={false}
                        style={{ flex: 1 }}
                        windowSize={3}
                    />
                </>
            )}
        </View>
    );
}
