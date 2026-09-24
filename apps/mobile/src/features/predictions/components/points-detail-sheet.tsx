import { useRouter } from 'expo-router';
import { CircleHelp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { teamName } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { buildBreakdownRows } from '@/features/predictions/breakdown-rows';
import { BreakdownRowItem } from '@/features/predictions/components/breakdown-row-item';
import { parseBreakdown, verdictOf } from '@/features/predictions/verdict';
import { useActiveScoringRules } from '@/features/scoring/use-active-scoring-rules';
import { winnerPointsByOutcome } from '@/features/scoring/potential-by-outcome';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

import { VerdictPill } from './verdict-pill';

type PointsDetailSheetProps = {
    match: MatchWithTeams;
    prediction: PredictionRow;
    visible: boolean;
    onClose: () => void;
};

/**
 * Bottom sheet « détail des points » (maquette Résultats) : score final vs
 * prono, points de base 1/N/2 (rappel de la carte de prono), lignes du
 * barème (✓/✗) depuis le breakdown persisté, total gagné.
 */
export function PointsDetailSheet({ match, prediction, visible, onClose }: PointsDetailSheetProps) {
    const { t } = useTranslation(['predictions', 'common', 'matches', 'scoring']);
    const router = useRouter();
    const textFaintColor = useThemeColor('text-faint');
    const rules = useActiveScoringRules();
    const breakdown = parseBreakdown(prediction);
    if (!breakdown) {
        return null;
    }

    // Rappel des points de base 1/N/2 vus pendant la phase de prono (même
    // calcul que la carte de prono : bon 1/N/2 seul, cote avec repli).
    const winnerPoints = winnerPointsByOutcome(
        { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
        rules,
    );
    const homeName = match.home_team ? teamName(match.home_team, t) : '?';
    const awayName = match.away_team ? teamName(match.away_team, t) : '?';
    const cells: { key: '1' | 'N' | '2'; outcome: 'home' | 'draw' | 'away' }[] = [
        { key: '1', outcome: 'home' },
        { key: 'N', outcome: 'draw' },
        { key: '2', outcome: 'away' },
    ];
    const rows = buildBreakdownRows({
        breakdown,
        total: prediction.points_awarded ?? 0,
        predictedHome: prediction.predicted_home_score,
        predictedAway: prediction.predicted_away_score,
        homeName,
        awayName,
        rules,
    });
    const bonusTags: string[] = [];
    if (prediction.predicted_bonus_off_home) {
        bonusTags.push(match.home_team?.code ?? match.home_team?.name ?? '?');
    }
    if (prediction.predicted_bonus_off_away) {
        bonusTags.push(match.away_team?.code ?? match.away_team?.name ?? '?');
    }

    // Bonus défensif appliqué : automatique, pas pronostiqué, mais signalé
    // dans la même rangée (pastille info, bleue)
    const defensiveApplied = breakdown.defensiveBonusPoints > 0;

    const title = `${homeName} – ${awayName}`;
    const total = prediction.points_awarded ?? 0;

    return (
        <BottomSheet
            backdropOpacity={0.4}
            className="border-t border-border"
            contentClassName="px-5"
            onClose={onClose}
            visible={visible}>
            <View className="mb-1 flex-row items-center justify-between gap-3">
                <Text
                    className="min-w-0 flex-1 font-body-bold text-[15px] text-text"
                    numberOfLines={1}>
                    {title}
                </Text>
                <VerdictPill verdict={verdictOf(prediction)} />
            </View>

            <View className="my-3 flex-row gap-2.5">
                <View className="flex-1 gap-1 rounded-sm bg-surface-sunken p-3">
                    <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                        {t('predictions:breakdown.finalScore')}
                    </Text>
                    <Text className="font-display text-[26px] leading-[27px] text-text">
                        {match.home_score} – {match.away_score}
                    </Text>
                </View>
                <View className="flex-1 gap-1 rounded-sm bg-surface-sunken p-3">
                    <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                        {t('predictions:reconciliation.yourProno')}
                    </Text>
                    <Text className="font-display text-[26px] leading-[27px] text-text-muted">
                        {prediction.predicted_home_score} – {prediction.predicted_away_score}
                    </Text>
                </View>
            </View>

            {bonusTags.length > 0 || defensiveApplied ? (
                <View className="mb-3 gap-2">
                    <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                        {t('predictions:breakdown.bonusPredicted')}
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-2">
                        {bonusTags.map((code) => (
                            <View
                                className="flex-row items-center gap-1.5 rounded-pill border border-border-strong px-2.5 py-1"
                                key={code}>
                                <View className="h-[5px] w-[5px] rounded-pill bg-text-muted" />
                                <Text className="font-body-semibold text-[12px] text-text-muted">
                                    {t('predictions:reconciliation.bonusTag', { code })}
                                </Text>
                            </View>
                        ))}
                        {defensiveApplied ? (
                            <View className="flex-row items-center gap-1.5 rounded-pill border border-info/45 bg-info/10 px-2.5 py-1">
                                <View className="h-[5px] w-[5px] rounded-pill bg-info" />
                                <Text className="font-body-semibold text-[12px] text-info">
                                    {t('predictions:breakdown.defensive')}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            ) : null}

            {/* Points de base · 1 N 2, issue pronostiquée en avant */}
            <View className="mb-3 gap-2">
                <Text className="text-center font-body-semibold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                    {t('predictions:breakdown.basePoints')}
                </Text>
                <View className="flex-row gap-2">
                    {cells.map(({ key, outcome }) => {
                        const active = breakdown.predictedOutcome === outcome;
                        return (
                            <View
                                className={cn(
                                    'flex-1 items-center gap-0.5 rounded-sm border-[1.5px] border-transparent bg-surface-sunken px-1 py-2',
                                    active && 'border-accent bg-accent/10',
                                )}
                                key={key}>
                                <Text
                                    className={cn(
                                        'font-body-bold text-[11px]',
                                        active ? 'text-accent' : 'text-text-faint',
                                    )}>
                                    {key}
                                </Text>
                                <Text className="font-display text-[20px] leading-[21px] text-text">
                                    {winnerPoints[outcome]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <View>
                {rows.map((row) => (
                    <BreakdownRowItem key={row.key} row={row} />
                ))}
            </View>

            <View className="mt-3.5 flex-row items-center justify-between gap-3">
                <Text className="font-body-bold text-[13px] uppercase tracking-[0.52px] text-text">
                    {t('predictions:breakdown.totalWon')}
                </Text>
                <View className="flex-row items-baseline gap-1">
                    <Text
                        className={cn(
                            'font-display text-[34px] leading-[34px]',
                            total > 0 ? 'text-accent' : 'text-text-faint',
                        )}>
                        {total}
                    </Text>
                    <Text
                        className={cn(
                            'font-body-bold text-[13px]',
                            total > 0 ? 'text-accent' : 'text-text-faint',
                        )}>
                        pts
                    </Text>
                </View>
            </View>

            {/* Renvoi au référentiel du barème — la sheet se ferme
                        d'abord, sinon elle reste au-dessus de l'écran Règles. */}
            <Pressable
                accessibilityRole="button"
                className="mt-3.5 flex-row items-center justify-center gap-1.5"
                hitSlop={8}
                onPress={() => {
                    onClose();
                    router.push('/rules');
                }}>
                <CircleHelp color={textFaintColor} size={14} strokeWidth={1.9} />
                <Text className="font-body-medium text-[12px] text-text-muted">
                    {t('scoring:rules.link')}
                </Text>
            </Pressable>

            <View className="mt-3">
                <Button
                    fullWidth
                    onPress={onClose}
                    title={t('common:actions.close')}
                    variant="secondary"
                />
            </View>
        </BottomSheet>
    );
}
