import type {
    OffensiveSideBreakdown,
    PointsBreakdown,
    ScoringRules,
} from '@/features/scoring/types';

export type BreakdownLabelKey =
    | 'predictions:breakdown.winner'
    | 'predictions:breakdown.winnerDraw'
    | 'predictions:breakdown.exactScore'
    | 'predictions:breakdown.gap'
    | 'predictions:breakdown.defensive'
    | 'predictions:breakdown.offensivePendingTeam'
    | 'predictions:breakdown.offensiveScored'
    | 'predictions:breakdown.offensiveMissed'
    | 'predictions:breakdown.joker';

export type BreakdownRow = {
    key: string;
    /** Clé i18n du libellé, traduite par le composant avec `params`. */
    labelKey: BreakdownLabelKey;
    params?: Record<string, string | number>;
    mark: 'ok' | 'ko' | 'info' | 'malus' | 'joker';
    points: number | null;
    /** Badge « écart ≤ N » de la ligne du bonus défensif. */
    defensiveGapBadge?: number;
};

type BuildBreakdownRowsInput = {
    breakdown: PointsBreakdown;
    /** Total du prono (persisté, ou provisoire en live) : la ligne joker en vaut la moitié. */
    total: number;
    predictedHome: number;
    predictedAway: number;
    homeCode: string;
    awayCode: string;
    rules: Pick<ScoringRules, 'defensiveBonusMaxGap'>;
    formatOdds: (odds: number) => string;
};

/**
 * Lignes ✓/✗ du barème d'un prono, partagées par la sheet de détail et la
 * carte « Points gagnés » du détail de match. Données seules : le composant
 * traduit `labelKey`.
 */
export function buildBreakdownRows({
    breakdown,
    total,
    predictedHome,
    predictedAway,
    homeCode,
    awayCode,
    rules,
    formatOdds,
}: BuildBreakdownRowsInput): BreakdownRow[] {
    // La cote utilisée est portée par la ligne vainqueur (c'est elle qui
    // explique le nombre de points) — pas de ligne « pondération » séparée.
    const odds = formatOdds(breakdown.oddsUsed);
    const rows: BreakdownRow[] = [
        breakdown.predictedOutcome === 'draw'
            ? {
                  key: 'winner',
                  labelKey: 'predictions:breakdown.winnerDraw',
                  params: { odds },
                  mark: breakdown.winnerCorrect ? 'ok' : 'ko',
                  points: breakdown.winnerPoints,
              }
            : {
                  key: 'winner',
                  labelKey: 'predictions:breakdown.winner',
                  params: {
                      code: breakdown.predictedOutcome === 'home' ? homeCode : awayCode,
                      odds,
                  },
                  mark: breakdown.winnerCorrect ? 'ok' : 'ko',
                  points: breakdown.winnerPoints,
              },
        {
            key: 'exact',
            labelKey: 'predictions:breakdown.exactScore',
            mark: breakdown.exactScorePoints > 0 ? 'ok' : 'ko',
            points: breakdown.exactScorePoints,
        },
    ];
    if (breakdown.gapPoints > 0) {
        rows.push({
            key: 'gap',
            labelKey: 'predictions:breakdown.gap',
            mark: 'ok',
            points: breakdown.gapPoints,
        });
    }
    // Affichée même non obtenue (elle porte la règle du volet), sauf quand le
    // prono lui-même dépasse l'écart max : le bonus n'était pas atteignable.
    if (Math.abs(predictedHome - predictedAway) <= rules.defensiveBonusMaxGap) {
        rows.push({
            key: 'defensive',
            labelKey: 'predictions:breakdown.defensive',
            mark: breakdown.defensiveBonusPoints > 0 ? 'ok' : 'ko',
            points: breakdown.defensiveBonusPoints,
            defensiveGapBadge: rules.defensiveBonusMaxGap,
        });
    }
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
                labelKey: 'predictions:breakdown.offensivePendingTeam',
                params: { code },
                mark: 'info',
                points: null,
            });
        } else if (side.points < 0) {
            rows.push({
                key,
                labelKey: 'predictions:breakdown.offensiveMissed',
                params: { code, tries: side.tries ?? 0 },
                mark: 'malus',
                points: side.points,
            });
        } else {
            rows.push({
                key,
                labelKey: 'predictions:breakdown.offensiveScored',
                params: { code, tries: side.tries ?? 0, odds: formatOdds(side.oddsUsed) },
                mark: side.points > 0 ? 'ok' : 'ko',
                points: side.points,
            });
        }
    }
    // Joker de la phase : le total est doublé — la ligne rapporte la seconde
    // moitié (= total de base), le total reste celui du scoring.
    if (breakdown.jokerMultiplier === 2) {
        rows.push({
            key: 'joker',
            labelKey: 'predictions:breakdown.joker',
            mark: 'joker',
            points: total / 2,
        });
    }
    return rows;
}
