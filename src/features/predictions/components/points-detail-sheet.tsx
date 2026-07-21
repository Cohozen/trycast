import { useRouter } from 'expo-router';
import { CircleHelp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { teamName } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { parseBreakdown, verdictOf } from '@/features/predictions/verdict';
import type { OffensiveSideBreakdown } from '@/features/scoring/types';
import { useActiveScoringRules } from '@/features/scoring/use-active-scoring-rules';
import { winnerPointsByOutcome } from '@/features/scoring/potential-by-outcome';
import { i18n } from '@/lib/i18n';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

import { VerdictPill } from './verdict-pill';

type PointsDetailSheetProps = {
    match: MatchWithTeams;
    prediction: PredictionRow;
    visible: boolean;
    onClose: () => void;
};

type Row = {
    key: string;
    label: string;
    mark: 'ok' | 'ko' | 'info' | 'malus';
    points: number | null;
    /** Badge optionnel affiché après le libellé (ex. bonus défensif). */
    badge?: string;
};

/**
 * Bottom sheet « détail des points » (maquette Résultats) : score final vs
 * prono, points de base 1/N/2 (rappel de la carte de prono), lignes du
 * barème (✓/✗) depuis le breakdown persisté, total gagné.
 */
export function PointsDetailSheet({ match, prediction, visible, onClose }: PointsDetailSheetProps) {
    const { t } = useTranslation(['predictions', 'common', 'matches', 'scoring']);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const textFaintColor = useThemeColor('text-faint');
    const rules = useActiveScoringRules();
    const breakdown = parseBreakdown(prediction);
    if (!breakdown) {
        return null;
    }

    const oddsFormatter = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
    // Rappel des points de base 1/N/2 vus pendant la phase de prono (même
    // calcul que la carte de prono : bon 1/N/2 seul, cote avec repli).
    const winnerPoints = winnerPointsByOutcome(
        { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
        rules,
    );
    const homeCode = match.home_team?.code ?? match.home_team?.name ?? '?';
    const awayCode = match.away_team?.code ?? match.away_team?.name ?? '?';
    const cells: { key: '1' | 'N' | '2'; outcome: 'home' | 'draw' | 'away' }[] = [
        { key: '1', outcome: 'home' },
        { key: 'N', outcome: 'draw' },
        { key: '2', outcome: 'away' },
    ];
    const winnerCode =
        breakdown.predictedOutcome === 'home'
            ? (match.home_team?.code ?? match.home_team?.name ?? '?')
            : (match.away_team?.code ?? match.away_team?.name ?? '?');

    // La cote utilisée est portée par la ligne vainqueur (c'est elle qui
    // explique le nombre de points) — pas de ligne « pondération » séparée.
    const oddsLabel = oddsFormatter.format(breakdown.oddsUsed);
    const rows: Row[] = [
        {
            key: 'winner',
            label:
                breakdown.predictedOutcome === 'draw'
                    ? t('predictions:breakdown.winnerDraw', { odds: oddsLabel })
                    : t('predictions:breakdown.winner', { code: winnerCode, odds: oddsLabel }),
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
    // Toujours affichée, même non obtenue : la ligne porte la règle du volet.
    rows.push({
        key: 'defensive',
        label: t('predictions:breakdown.defensive'),
        mark: breakdown.defensiveBonusPoints > 0 ? 'ok' : 'ko',
        points: breakdown.defensiveBonusPoints,
        badge: t('predictions:breakdown.defensiveGap', {
            gap: rules.defensiveBonusMaxGap,
        }),
    });
    // Une ligne par équipe cochée (bonus ou malus), tolère un breakdown v1
    // (offensiveHome/Away absents ⇒ non coché).
    const offensiveSides: { key: string; side?: OffensiveSideBreakdown; code: string }[] = [
        { key: 'offensive-home', side: breakdown.offensiveHome, code: homeCode },
        { key: 'offensive-away', side: breakdown.offensiveAway, code: awayCode },
    ];
    for (const { key, side, code } of offensiveSides) {
        if (!side?.checked) continue;
        if (side.pending) {
            rows.push({
                key,
                label: t('predictions:breakdown.offensivePendingTeam', { code }),
                mark: 'info',
                points: null,
            });
        } else if (side.points > 0) {
            rows.push({
                key,
                label: t('predictions:breakdown.offensiveScored', {
                    code,
                    tries: side.tries ?? 0,
                    odds: oddsFormatter.format(side.oddsUsed),
                }),
                mark: 'ok',
                points: side.points,
            });
        } else if (side.points < 0) {
            rows.push({
                key,
                label: t('predictions:breakdown.offensiveMissed', {
                    code,
                    tries: side.tries ?? 0,
                }),
                mark: 'malus',
                points: side.points,
            });
        } else {
            rows.push({
                key,
                label: t('predictions:breakdown.offensiveScored', {
                    code,
                    tries: side.tries ?? 0,
                    odds: oddsFormatter.format(side.oddsUsed),
                }),
                mark: 'ko',
                points: 0,
            });
        }
    }
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
                                        row.mark === 'malus' && 'bg-danger/15',
                                        row.mark === 'info' && 'border border-border-strong',
                                    )}>
                                    <Text
                                        className={cn(
                                            'font-body-bold text-[12px]',
                                            row.mark === 'ok' && 'text-success',
                                            row.mark === 'ko' && 'text-text-faint',
                                            row.mark === 'malus' && 'text-danger',
                                            row.mark === 'info' && 'text-text-faint',
                                        )}>
                                        {row.mark === 'ok' ? '✓' : row.mark === 'info' ? 'i' : '✗'}
                                    </Text>
                                </View>
                                <View className="flex-1 flex-row items-center gap-2">
                                    <Text className="shrink font-body text-[14px] text-text">
                                        {row.label}
                                    </Text>
                                    {row.badge ? (
                                        <Badge tone="info" variant="soft">
                                            {row.badge}
                                        </Badge>
                                    ) : null}
                                </View>
                                {row.points !== null ? (
                                    <Text
                                        className={cn(
                                            'font-body-bold text-[14px]',
                                            row.points > 0 && 'text-text',
                                            row.points < 0 && 'text-danger',
                                            row.points === 0 && 'text-text-faint',
                                        )}>
                                        {row.points > 0
                                            ? `+${row.points}`
                                            : row.points < 0
                                              ? `${row.points}`
                                              : '0'}
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
                </View>
            </View>
        </Modal>
    );
}
