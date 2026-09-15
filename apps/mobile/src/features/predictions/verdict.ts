import type { PointsBreakdown } from '@/features/scoring/types';
import type { PredictionRow } from '@/features/predictions/types';

export type Verdict = 'exact' | 'good' | 'missed' | 'pending';

/** Breakdown de scoring persisté sur le prono (null tant que non scoré). */
export function parseBreakdown(prediction: PredictionRow): PointsBreakdown | null {
    if (prediction.points_breakdown === null || typeof prediction.points_breakdown !== 'object') {
        return null;
    }
    return prediction.points_breakdown as unknown as PointsBreakdown;
}

/** Verdict d'un prono scoré : score exact > bon résultat > raté ; pending sinon. */
export function verdictOf(prediction: PredictionRow): Verdict {
    const breakdown = parseBreakdown(prediction);
    if (prediction.points_awarded === null || breakdown === null) {
        return 'pending';
    }
    if (breakdown.exactScorePoints > 0) {
        return 'exact';
    }
    return breakdown.winnerCorrect ? 'good' : 'missed';
}
