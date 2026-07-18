import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DayStrip } from '@/features/matches/components/day-strip';
import { buildDayRange, dayKeyOf, MATCH_DAYS_ONLY } from '@/features/matches/day-range';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { ResultCard } from '@/features/predictions/components/result-card';
import { splitMatches } from '@/features/predictions/split-matches';
import { useCommunityDistributions } from '@/features/predictions/use-community-distributions';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { i18n } from '@/lib/i18n';
import { ScrollView, Text, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

export default function ResultsScreen() {
    const { t } = useTranslation(['matches', 'predictions', 'common']);
    const router = useRouter();
    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);
    const predictions = useMyPredictions(competition.data?.id);
    const distributions = useCommunityDistributions(competition.data?.id);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const screenInsets = useScreenInsets();

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
                <Skeleton className="h-[74px]" variant="block" />
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
    const currentDay = selectedDay ?? days.findLast((day) => day.hasMatches)?.key ?? null;
    const dayResults = results.filter((m) => dayKeyOf(m.kickoff_at) === currentDay);
    const dayTitle =
        dayResults.length > 0
            ? new Intl.DateTimeFormat(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
              }).format(new Date(dayResults[0].kickoff_at))
            : '';

    return (
        <View className="flex-1 bg-bg">
            <View className="flex-none px-5 pb-3" style={{ paddingTop: screenInsets.top }}>
                <View className="gap-1">
                    <Text className="font-display text-[30px] leading-[30px] tracking-[0.3px] text-text">
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
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="w-full max-w-[800px] gap-3 self-center px-5 pt-4"
                        contentContainerStyle={{ paddingBottom: screenInsets.bottomTabBar }}>
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
                </>
            )}
        </View>
    );
}
