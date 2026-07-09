import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DayStrip, type StripDay } from '@/features/matches/components/day-strip';
import type { MatchWithTeams } from '@/features/matches/types';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useMatches } from '@/features/matches/use-matches';
import { ResultCard } from '@/features/predictions/components/result-card';
import { splitMatches } from '@/features/predictions/split-matches';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { i18n } from '@/lib/i18n';
import { ScrollView, Text, View } from '@/tw';

function dayKeyOf(iso: string): string {
    const date = new Date(iso);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Jours distincts des résultats, du plus récent au plus ancien. */
function buildDays(results: MatchWithTeams[]): StripDay[] {
    const days: StripDay[] = [];
    for (const match of results) {
        const key = dayKeyOf(match.kickoff_at);
        if (days.at(-1)?.key !== key) {
            days.push({ key, date: new Date(match.kickoff_at) });
        }
    }
    return days;
}

export default function ResultsScreen() {
    const { t } = useTranslation(['matches', 'predictions', 'common']);
    const competition = useActiveCompetition();
    const matches = useMatches(competition.data?.id);
    const predictions = useMyPredictions(competition.data?.id);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    if (
        competition.isPending ||
        (competition.data && (matches.isPending || predictions.isPending))
    ) {
        return (
            <View className="flex-1 gap-3 bg-bg px-5 pb-32 pt-14">
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
    const days = buildDays(results);
    const currentDay = selectedDay ?? days[0]?.key ?? null;
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
            <View className="flex-none px-5 pb-3 pt-14">
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
                    {days.length > 1 ? (
                        <DayStrip
                            days={days}
                            onSelect={setSelectedDay}
                            selected={currentDay ?? ''}
                        />
                    ) : null}
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="w-full max-w-[800px] gap-3 self-center px-5 pb-32 pt-4">
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
                                key={match.id}
                                match={match}
                                prediction={predictions.data?.get(match.id)}
                            />
                        ))}
                    </ScrollView>
                </>
            )}
        </View>
    );
}
