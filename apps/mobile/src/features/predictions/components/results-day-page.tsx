import { useTranslation } from 'react-i18next';

import { usePullToRefresh } from '@/components/ui/use-pull-to-refresh';
import type { MatchWithTeams } from '@/features/matches/types';
import { ResultCard } from '@/features/predictions/components/result-card';
import type { PredictionDistribution, PredictionRow } from '@/features/predictions/types';
import { i18n } from '@/lib/i18n';
import { ScrollView, Text, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

type ResultsDayPageProps = {
    /** Largeur de la page = largeur d'écran (le carrousel pagine dessus). */
    width: number;
    /** Résultats de ce jour, déjà triés (du plus récent au plus ancien). */
    matches: MatchWithTeams[];
    predictions?: Map<string, PredictionRow>;
    distributions?: Map<string, PredictionDistribution>;
    onOpenMatch: (matchId: string) => void;
    /** Rejoué au pull-to-refresh (chaque page a son propre RefreshControl). */
    onRefresh: () => Promise<unknown>;
};

/**
 * Une page du carrousel Résultats : la liste verticale des matchs d'un jour,
 * avec son en-tête (jour + compteur) et son propre « tirer pour rafraîchir ».
 * Rendue une fois par jour à matchs, virtualisée par la FlatList horizontale.
 */
export function ResultsDayPage({
    width,
    matches,
    predictions,
    distributions,
    onOpenMatch,
    onRefresh,
}: ResultsDayPageProps) {
    const { t } = useTranslation(['matches', 'predictions']);
    const screenInsets = useScreenInsets();
    const refreshControl = usePullToRefresh(onRefresh);

    const dayTitle =
        matches.length > 0
            ? new Intl.DateTimeFormat(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
              }).format(new Date(matches[0].kickoff_at))
            : '';

    return (
        <View style={{ width }}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="w-full max-w-[800px] gap-3 self-center px-5 pt-4"
                contentContainerStyle={{ paddingBottom: screenInsets.bottomTabBar }}
                refreshControl={refreshControl}>
                <View className="flex-row items-baseline justify-between gap-3 px-0.5">
                    <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                        {dayTitle}
                    </Text>
                    <Text className="font-body-bold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                        {t('matches:results.count', { count: matches.length })}
                    </Text>
                </View>
                {matches.map((match) => (
                    <ResultCard
                        distribution={distributions?.get(match.id)}
                        key={match.id}
                        match={match}
                        onOpenMatch={() => onOpenMatch(match.id)}
                        prediction={predictions?.get(match.id)}
                    />
                ))}
            </ScrollView>
        </View>
    );
}
