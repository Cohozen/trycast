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
    | 'predictions:breakdown.offensive'
    | 'predictions:breakdown.joker';

export type BreakdownDetailKey =
    | 'predictions:breakdown.offensiveTries'
    | 'predictions:breakdown.offensivePending';

export type BreakdownRow = {
    key: string;
    /** Clé i18n du libellé, traduite par le composant avec `params`. */
    labelKey: BreakdownLabelKey;
    params?: Record<string, string | number>;
    mark: 'ok' | 'ko' | 'info' | 'malus' | 'joker';
    points: number | null;
    /** Badge « écart ≤ N » de la ligne du bonus défensif. */
    defensiveGapBadge?: number;
    /** Précision discrète après le libellé (essais d'une ligne offensive). */
    detail?: { key: BreakdownDetailKey; params?: Record<string, number> };
};

type BuildBreakdownRowsInput = {
    breakdown: PointsBreakdown;
    /** Total du prono (persisté, ou provisoire en live) : la ligne joker en vaut la moitié. */
    total: number;
    predictedHome: number;
    predictedAway: number;
    /** Noms d'équipe complets, déjà traduits (lignes offensives). */
    homeName: string;
    awayName: string;
    rules: Pick<ScoringRules, 'defensiveBonusMaxGap'>;
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
    homeName,
    awayName,
    rules,
}: BuildBreakdownRowsInput): BreakdownRow[] {
    // Libellé nu : ni équipe ni cote (retour Corentin 2026-09-23) — la cote
    // reste lisible dans les points de base 1/N/2 de la sheet.
    const rows: BreakdownRow[] = [
        {
            key: 'winner',
            labelKey:
                breakdown.predictedOutcome === 'draw'
                    ? 'predictions:breakdown.winnerDraw'
                    : 'predictions:breakdown.winner',
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
    // (offensiveHome/Away absents ⇒ non coché). Les essais passent en précision.
    const offensiveSides: { key: string; side?: OffensiveSideBreakdown; team: string }[] = [
        { key: 'offensive-home', side: breakdown.offensiveHome, team: homeName },
        { key: 'offensive-away', side: breakdown.offensiveAway, team: awayName },
    ];
    for (const { key, side, team } of offensiveSides) {
        if (!side?.checked) continue;
        rows.push({
            key,
            labelKey: 'predictions:breakdown.offensive',
            params: { team },
            mark: side.pending ? 'info' : side.points > 0 ? 'ok' : side.points < 0 ? 'malus' : 'ko',
            points: side.pending ? null : side.points,
            detail: side.pending
                ? { key: 'predictions:breakdown.offensivePending' }
                : {
                      key: 'predictions:breakdown.offensiveTries',
                      params: { count: side.tries ?? 0 },
                  },
        });
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
