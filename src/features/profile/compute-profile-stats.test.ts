import { describe, expect, it } from 'vitest';

import type { PredictionRow } from '@/features/predictions/types';
import type { Verdict } from '@/features/predictions/verdict';
import { computeProfileStats } from './compute-profile-stats';

/** Prono minimal portant juste ce que verdictOf consomme. */
function prediction(verdict: Verdict): PredictionRow {
    if (verdict === 'pending') {
        return { points_awarded: null, points_breakdown: null } as unknown as PredictionRow;
    }
    return {
        points_awarded: verdict === 'missed' ? 0 : 10,
        points_breakdown: {
            winnerCorrect: verdict !== 'missed',
            exactScorePoints: verdict === 'exact' ? 50 : 0,
        },
    } as unknown as PredictionRow;
}

describe('computeProfileStats', () => {
    it('compte joués/scorés/bons/exacts/ratés et la précision', () => {
        const stats = computeProfileStats([
            prediction('exact'),
            prediction('good'),
            prediction('good'),
            prediction('missed'),
            prediction('pending'),
        ]);
        expect(stats).toEqual({
            played: 5,
            scored: 4,
            good: 3,
            exact: 1,
            missed: 1,
            precisionPct: 75,
        });
    });

    it('précision null tant que rien n’est scoré', () => {
        expect(computeProfileStats([prediction('pending')]).precisionPct).toBeNull();
        expect(computeProfileStats([]).precisionPct).toBeNull();
    });
});
