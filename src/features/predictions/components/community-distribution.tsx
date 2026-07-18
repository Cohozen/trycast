import { useTranslation } from 'react-i18next';

import { distributionPercentages } from '@/features/predictions/distribution-percentages';
import type { PredictionDistribution } from '@/features/predictions/types';
import { probabilityTone } from '@/features/scoring/potential-by-outcome';
import type { MatchOutcome } from '@/features/scoring/types';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type CommunityDistributionProps = {
    distribution: PredictionDistribution;
    /** Issue jouée par l'utilisateur, mise en avant dans les labels. */
    predictedOutcome?: MatchOutcome | null;
    /** Avec en-tête + labels 1/N/2 et % (Résultats) ; sans = barres seules sous les cellules de la carte prono. */
    withLabels?: boolean;
};

const TONE_CLASSES = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
} as const;

const CELLS: { key: '1' | 'N' | '2'; outcome: MatchOutcome }[] = [
    { key: '1', outcome: 'home' },
    { key: 'N', outcome: 'draw' },
    { key: '2', outcome: 'away' },
];

/**
 * Barres de distribution communautaire 1/N/2 d'un match (ce que la
 * communauté a joué — à ne pas confondre avec les probabilités des cotes).
 * Le total de pronos est toujours affiché : avec les petits effectifs du
 * jeu, un pourcentage seul serait trompeur.
 */
export function CommunityDistribution({
    distribution,
    predictedOutcome = null,
    withLabels = false,
}: CommunityDistributionProps) {
    const { t } = useTranslation(['predictions']);
    const percentages = distributionPercentages(distribution);
    if (percentages === null) return null;

    const bar = (outcome: MatchOutcome) => (
        <View className="h-1 w-full overflow-hidden rounded-pill bg-text/10">
            <View
                className={cn(
                    'h-full rounded-pill',
                    TONE_CLASSES[probabilityTone(percentages[outcome] / 100)],
                )}
                style={{ width: `${percentages[outcome]}%` }}
            />
        </View>
    );

    if (!withLabels) {
        return (
            <View className="gap-1.5">
                <View className="flex-row gap-2">
                    {CELLS.map(({ key, outcome }) => (
                        <View className="flex-1 px-1" key={key}>
                            {bar(outcome)}
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View className="gap-2">
            <View className="flex-row items-center justify-between gap-2">
                <Text className="font-body-semibold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                    {t('predictions:distribution.title')}
                </Text>
                <Text className="font-body-semibold text-[10.5px] text-text-faint">
                    {t('predictions:distribution.count', { count: distribution.total })}
                </Text>
            </View>
            <View className="flex-row gap-2">
                {CELLS.map(({ key, outcome }) => {
                    const mine = predictedOutcome === outcome;
                    return (
                        <View className="flex-1 items-center gap-1 px-1" key={key}>
                            <View className="flex-row items-baseline gap-1">
                                <Text
                                    className={cn(
                                        'font-body-bold text-[10.5px]',
                                        mine ? 'text-accent opacity-70' : 'text-text-faint',
                                    )}>
                                    {key}
                                </Text>
                                <Text
                                    className={cn(
                                        'font-body-bold text-[11.5px]',
                                        mine ? 'text-accent' : 'text-text-muted',
                                    )}>
                                    {percentages[outcome]}%
                                </Text>
                            </View>
                            {bar(outcome)}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
