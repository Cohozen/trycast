import { useTranslation } from 'react-i18next';

import { teamName } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import { buildBreakdownRows } from '@/features/predictions/breakdown-rows';
import { BreakdownRowItem } from '@/features/predictions/components/breakdown-row-item';
import { matchPointsOf } from '@/features/predictions/match-points-of';
import type { PredictionRow } from '@/features/predictions/types';
import { useActiveScoringRules } from '@/features/scoring/use-active-scoring-rules';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type PointsEarnedCardProps = {
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
    /** Mon joker de la phase est posé sur ce match (points provisoires doublés). */
    jokerOn?: boolean;
};

/**
 * Carte « Points gagnés » du détail d'un match en cours ou terminé (maquette
 * Match Detail, DS 2026-09-23) : total en tête, lignes du barème dessous.
 * Terminé : breakdown persisté par le scoring. En cours : points PROVISOIRES,
 * calculés contre le score live par `matchPointsOf` (module de scoring partagé,
 * décision 2026-09-23) — essais inconnus en direct, le bonus offensif reste
 * « en attente ».
 */
export function PointsEarnedCard({ match, prediction, jokerOn = false }: PointsEarnedCardProps) {
    const { t } = useTranslation(['predictions', 'matches']);
    const rules = useActiveScoringRules();
    const isLive = match.status === 'in_play';

    const points = matchPointsOf(match, prediction, jokerOn, rules);

    const rows =
        prediction && points
            ? buildBreakdownRows({
                  breakdown: points.breakdown,
                  total: points.total,
                  predictedHome: prediction.predicted_home_score,
                  predictedAway: prediction.predicted_away_score,
                  homeName: match.home_team ? teamName(match.home_team, t) : '?',
                  awayName: match.away_team ? teamName(match.away_team, t) : '?',
                  rules,
              })
            : [];
    const exact = (points?.breakdown.exactScorePoints ?? 0) > 0;
    // Sans prono : 0 pt ; prono pas encore scoré (lag de sync-results) : « – »
    const total = prediction ? (points?.total ?? null) : 0;
    const positive = (total ?? 0) > 0;

    return (
        <View
            className={cn(
                'gap-3 rounded-md bg-surface p-4',
                exact
                    ? 'border-[1.5px] border-accent/45 tc-glow-accent'
                    : 'border border-border tc-shadow-sm',
            )}>
            <View className="flex-row items-end justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1 pb-0.5">
                    <Text className="font-body-bold text-[11px] uppercase tracking-[0.88px] text-text-muted">
                        {t(
                            isLive
                                ? 'predictions:reconciliation.provisionalPoints'
                                : 'predictions:reconciliation.pointsWon',
                        )}
                    </Text>
                    {prediction ? (
                        <Text className="font-body text-[13px] text-text-muted">
                            {t('predictions:reconciliation.yourProno')}{' '}
                            <Text className="font-body-bold text-text">
                                {prediction.predicted_home_score} –{' '}
                                {prediction.predicted_away_score}
                            </Text>
                        </Text>
                    ) : (
                        <Text className="font-body text-[13px] text-text-muted">
                            {t('predictions:reconciliation.notPredicted')}
                        </Text>
                    )}
                </View>
                <View className="flex-row items-baseline gap-1">
                    {/* Sans le padding de police d'Android, Anton à 40 px gonfle la
                        rangée (alignée en bas) et creuse le haut de la carte */}
                    <Text
                        className={cn(
                            'font-display text-[40px] leading-[40px]',
                            positive ? 'text-accent' : 'text-text-faint',
                        )}
                        style={{ includeFontPadding: false }}>
                        {total === null ? '–' : positive ? `+${total}` : '0'}
                    </Text>
                    <Text
                        className={cn(
                            'font-body-bold text-[13px]',
                            positive ? 'text-accent' : 'text-text-faint',
                        )}>
                        pts
                    </Text>
                </View>
            </View>

            {rows.length > 0 ? (
                <View>
                    {rows.map((row) => (
                        <BreakdownRowItem dense key={row.key} row={row} />
                    ))}
                </View>
            ) : null}

            {isLive && prediction ? (
                <Text className="font-body text-[11px] text-text-faint">
                    {t('predictions:reconciliation.provisionalNote')}
                </Text>
            ) : prediction && total === null ? (
                <Text className="font-body text-[12px] text-text-muted">
                    {t('predictions:verdict.pending')}
                </Text>
            ) : null}
        </View>
    );
}
