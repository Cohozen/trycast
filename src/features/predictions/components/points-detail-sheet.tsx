import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { teamName } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { parseBreakdown, verdictOf } from '@/features/predictions/verdict';
import { BAREME_V1 } from '@/features/scoring/bareme';
import { winnerPointsByOutcome } from '@/features/scoring/potential-by-outcome';
import { i18n } from '@/lib/i18n';
import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

import { VerdictPill } from './verdict-pill';

type PointsDetailSheetProps = {
    match: MatchWithTeams;
    prediction: PredictionRow;
    visible: boolean;
    onClose: () => void;
};

type Row = { key: string; label: string; mark: 'ok' | 'ko' | 'info'; points: number | null };

/**
 * Bottom sheet « détail des points » (maquette Résultats) : score final vs
 * prono, points de base 1/N/2 (rappel de la carte de prono), lignes du
 * barème (✓/✗) depuis le breakdown persisté, total gagné.
 */
export function PointsDetailSheet({ match, prediction, visible, onClose }: PointsDetailSheetProps) {
    const { t } = useTranslation(['predictions', 'common', 'matches']);
    const insets = useSafeAreaInsets();
    const breakdown = parseBreakdown(prediction);
    if (!breakdown) {
        return null;
    }

    const oddsFormatter = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
    // Rappel des points de base 1/N/2 vus pendant la phase de prono (même
    // calcul que la carte de prono : bon 1/N/2 seul, cote avec repli).
    const winnerPoints = winnerPointsByOutcome(
        { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
        BAREME_V1,
    );
    const cells: { key: '1' | 'N' | '2'; outcome: 'home' | 'draw' | 'away' }[] = [
        { key: '1', outcome: 'home' },
        { key: 'N', outcome: 'draw' },
        { key: '2', outcome: 'away' },
    ];
    const winnerCode =
        breakdown.predictedOutcome === 'home'
            ? (match.home_team?.code ?? match.home_team?.name ?? '?')
            : (match.away_team?.code ?? match.away_team?.name ?? '?');

    const rows: Row[] = [
        {
            key: 'winner',
            label:
                breakdown.predictedOutcome === 'draw'
                    ? t('predictions:breakdown.winnerDraw')
                    : t('predictions:breakdown.winner', { code: winnerCode }),
            mark: breakdown.winnerCorrect ? 'ok' : 'ko',
            points: breakdown.winnerPoints,
        },
        {
            key: 'exact',
            label: t('predictions:breakdown.exactScore'),
            mark: breakdown.exactScorePoints > 0 ? 'ok' : 'ko',
            points: breakdown.exactScorePoints,
        },
    ];
    if (breakdown.gapPoints > 0) {
        rows.push({
            key: 'gap',
            label: t('predictions:breakdown.gap'),
            mark: 'ok',
            points: breakdown.gapPoints,
        });
    }
    if (breakdown.defensiveBonusPoints > 0) {
        rows.push({
            key: 'defensive',
            label: t('predictions:breakdown.defensive'),
            mark: 'ok',
            points: breakdown.defensiveBonusPoints,
        });
    }
    if (breakdown.offensiveBonusPending) {
        rows.push({
            key: 'offensive',
            label: t('predictions:breakdown.offensivePending'),
            mark: 'info',
            points: null,
        });
    } else if (prediction.predicted_bonus_off_home || prediction.predicted_bonus_off_away) {
        rows.push({
            key: 'offensive',
            label: t('predictions:breakdown.offensive'),
            mark: breakdown.offensiveBonusPoints > 0 ? 'ok' : 'ko',
            points: breakdown.offensiveBonusPoints,
        });
    }
    rows.push({
        key: 'odds',
        label: t('predictions:breakdown.odds', {
            odds: oddsFormatter.format(breakdown.oddsUsed),
        }),
        mark: 'info',
        points: null,
    });

    const bonusTags: string[] = [];
    if (prediction.predicted_bonus_off_home) {
        bonusTags.push(match.home_team?.code ?? match.home_team?.name ?? '?');
    }
    if (prediction.predicted_bonus_off_away) {
        bonusTags.push(match.away_team?.code ?? match.away_team?.name ?? '?');
    }

    const homeName = match.home_team ? teamName(match.home_team, t) : '?';
    const awayName = match.away_team ? teamName(match.away_team, t) : '?';
    const title = `${homeName} – ${awayName}`;
    const total = prediction.points_awarded ?? 0;

    return (
        <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
            <View className="flex-1 justify-end">
                <Pressable className="absolute inset-0 bg-[#16130E]/40" onPress={onClose} />
                {/* Padding bas au-dessus de la barre gestuelle, plancher 32px (ex pb-8). */}
                <View
                    className="rounded-t-lg border-t border-border bg-surface px-5 pt-2.5 tc-shadow-lg"
                    style={{ paddingBottom: Math.max(insets.bottom, 32) }}>
                    <View className="mb-4 mt-1 h-1 w-10 self-center rounded-pill bg-border-strong" />

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
                                {prediction.predicted_home_score} –{' '}
                                {prediction.predicted_away_score}
                            </Text>
                        </View>
                    </View>

                    {bonusTags.length > 0 ? (
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
                            <View
                                className="flex-row items-center gap-3 border-b border-border py-2.5"
                                key={row.key}>
                                <View
                                    className={cn(
                                        'h-[22px] w-[22px] items-center justify-center rounded-pill',
                                        row.mark === 'ok' && 'bg-success/15',
                                        row.mark === 'ko' && 'bg-text/10',
                                        row.mark === 'info' && 'border border-border-strong',
                                    )}>
                                    <Text
                                        className={cn(
                                            'font-body-bold text-[12px]',
                                            row.mark === 'ok' && 'text-success',
                                            row.mark === 'ko' && 'text-text-faint',
                                            row.mark === 'info' && 'text-text-faint',
                                        )}>
                                        {row.mark === 'ok' ? '✓' : row.mark === 'ko' ? '✗' : 'i'}
                                    </Text>
                                </View>
                                <Text className="flex-1 font-body text-[14px] text-text">
                                    {row.label}
                                </Text>
                                {row.points !== null ? (
                                    <Text
                                        className={cn(
                                            'font-body-bold text-[14px]',
                                            row.points > 0 ? 'text-text' : 'text-text-faint',
                                        )}>
                                        {row.points > 0 ? `+${row.points}` : '0'}
                                    </Text>
                                ) : null}
                            </View>
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

                    <View className="mt-4">
                        <Button
                            fullWidth
                            onPress={onClose}
                            title={t('common:actions.close')}
                            variant="secondary"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
