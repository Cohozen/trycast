import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TeamFlag } from '@/features/matches/components/team-flag';
import { formatKickoffTime, statusLabel } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import { CommunityDistribution } from '@/features/predictions/components/community-distribution';
import { PointsDetailSheet } from '@/features/predictions/components/points-detail-sheet';
import { VerdictPill } from '@/features/predictions/components/verdict-pill';
import type { PredictionDistribution, PredictionRow } from '@/features/predictions/types';
import { verdictOf } from '@/features/predictions/verdict';
import { i18n } from '@/lib/i18n';
import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type ResultCardProps = {
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
    /** Distribution communautaire du match (bloc « La communauté a joué »). */
    distribution?: PredictionDistribution;
};

/**
 * Carte de la page Résultats (maquette) : score final avec vainqueur mis en
 * avant, réconciliation du prono (verdict, bonus cochés, points gagnés) et
 * accès au détail du barème en bottom sheet.
 */
export function ResultCard({ match, prediction, distribution }: ResultCardProps) {
    const { t } = useTranslation(['predictions', 'matches']);
    const [detailOpen, setDetailOpen] = useState(false);

    const verdict = prediction ? verdictOf(prediction) : null;
    const scored = prediction != null && prediction.points_awarded !== null;
    const statusKey = statusLabel(match.status);
    const predictedOutcome = prediction
        ? prediction.predicted_home_score > prediction.predicted_away_score
            ? ('home' as const)
            : prediction.predicted_home_score < prediction.predicted_away_score
              ? ('away' as const)
              : ('draw' as const)
        : null;

    const homeWins =
        match.home_score !== null && match.away_score !== null
            ? match.home_score > match.away_score
            : null;

    const bonusTags: string[] = [];
    if (prediction?.predicted_bonus_off_home) {
        bonusTags.push(match.home_team?.code ?? match.home_team?.name ?? '?');
    }
    if (prediction?.predicted_bonus_off_away) {
        bonusTags.push(match.away_team?.code ?? match.away_team?.name ?? '?');
    }

    const teamRow = (side: 'home' | 'away') => {
        const team = side === 'home' ? match.home_team : match.away_team;
        const score = side === 'home' ? match.home_score : match.away_score;
        const winner = homeWins === null ? null : side === 'home' ? homeWins : !homeWins;
        return (
            <View className="flex-row items-center gap-3">
                <TeamFlag team={team} />
                <Text
                    className={cn(
                        'flex-1 font-body-semibold text-[16px]',
                        winner === false ? 'text-text-muted' : 'text-text',
                    )}>
                    {team?.name ?? t('matches:teamTbd')}
                </Text>
                <Text
                    className={cn(
                        'font-display text-[27px] leading-[28px]',
                        winner === false ? 'text-text-muted' : 'text-text',
                    )}>
                    {score ?? '–'}
                </Text>
            </View>
        );
    };

    return (
        <>
            <Pressable disabled={!scored} onPress={() => setDetailOpen(true)}>
                <View className="rounded-md border border-border bg-surface p-4 tc-shadow-sm">
                    <View className="mb-3 flex-row items-center justify-between gap-2">
                        <Text className="font-body-semibold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                            {formatKickoffTime(match.kickoff_at, { locale: i18n.language })}
                        </Text>
                        {verdict ? <VerdictPill verdict={verdict} /> : null}
                        {statusKey ? (
                            <Text className="font-body-semibold text-[10.5px] uppercase tracking-[0.84px] text-text-faint">
                                {t(statusKey)}
                            </Text>
                        ) : null}
                    </View>

                    <View className="gap-2.5">
                        {teamRow('home')}
                        {teamRow('away')}
                    </View>

                    <View className="mt-3.5 border-t border-dashed border-border pt-3">
                        {prediction ? (
                            <View className="gap-2.5">
                                <View className="flex-row items-center justify-between gap-3">
                                    <View className="min-w-0 gap-1.5">
                                        <Text className="font-body-semibold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                                            {t('predictions:reconciliation.yourProno')}
                                        </Text>
                                        <View className="self-start rounded-pill bg-surface-sunken px-2.5 py-0.5">
                                            <Text className="font-body-bold text-[13px] text-text-muted">
                                                {prediction.predicted_home_score} –{' '}
                                                {prediction.predicted_away_score}
                                            </Text>
                                        </View>
                                        {bonusTags.length > 0 ? (
                                            <View className="mt-px flex-row flex-wrap gap-1.5">
                                                {bonusTags.map((code) => (
                                                    <View
                                                        className="flex-row items-center gap-1 rounded-pill border border-border-strong px-2 py-0.5"
                                                        key={code}>
                                                        <View className="h-1 w-1 rounded-pill bg-text-muted" />
                                                        <Text className="font-body-semibold text-[10.5px] text-text-muted">
                                                            {t(
                                                                'predictions:reconciliation.bonusTag',
                                                                { code },
                                                            )}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : null}
                                    </View>
                                    <View
                                        className={cn(
                                            'items-center gap-px rounded-md px-4 py-2',
                                            scored && (prediction.points_awarded ?? 0) > 0
                                                ? 'border border-accent/30 bg-accent/10'
                                                : 'bg-surface-sunken',
                                        )}>
                                        <Text className="font-body-bold text-[9px] uppercase tracking-[0.63px] text-text-faint">
                                            {scored
                                                ? t('predictions:reconciliation.pointsWon')
                                                : t('predictions:verdict.pending')}
                                        </Text>
                                        <View className="flex-row items-baseline gap-1">
                                            <Text
                                                className={cn(
                                                    'font-display text-[36px] leading-[37px]',
                                                    scored && (prediction.points_awarded ?? 0) > 0
                                                        ? 'text-accent'
                                                        : 'text-text-faint',
                                                )}>
                                                {scored ? prediction.points_awarded : '–'}
                                            </Text>
                                            <Text
                                                className={cn(
                                                    'font-body-bold text-[13px]',
                                                    scored && (prediction.points_awarded ?? 0) > 0
                                                        ? 'text-accent'
                                                        : 'text-text-faint',
                                                )}>
                                                pts
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                {scored ? (
                                    <View className="mt-0.5 flex-row items-center justify-center gap-1">
                                        <Text className="font-body-semibold text-[11px] text-text-faint">
                                            {t('predictions:reconciliation.seeDetails')} ›
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : (
                            <View className="flex-row items-center justify-between gap-3">
                                <Text className="flex-1 font-body text-[13px] text-text-muted">
                                    {t('predictions:reconciliation.notPredicted')}
                                </Text>
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="font-display text-[22px] leading-[23px] text-text-faint">
                                        0
                                    </Text>
                                    <Text className="font-body-bold text-[11px] text-text-faint">
                                        pt
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {distribution && distribution.total > 0 ? (
                        <View className="mt-3 border-t border-dashed border-border pt-3">
                            <CommunityDistribution
                                distribution={distribution}
                                predictedOutcome={predictedOutcome}
                                withLabels
                            />
                        </View>
                    ) : null}
                </View>
            </Pressable>

            {prediction && scored ? (
                <PointsDetailSheet
                    match={match}
                    onClose={() => setDetailOpen(false)}
                    prediction={prediction}
                    visible={detailOpen}
                />
            ) : null}
        </>
    );
}
