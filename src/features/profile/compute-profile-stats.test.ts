import { describe, expect, it } from 'vitest';

import type { MatchWithTeams } from '@/features/matches/types';
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

/** Map match_id → prono, ids m0, m1, … */
function predictionMap(verdicts: Verdict[]): Map<string, PredictionRow> {
    return new Map(verdicts.map((verdict, index) => [`m${index}`, prediction(verdict)]));
}

function match(
    id: string,
    status: MatchWithTeams['status'],
): Pick<MatchWithTeams, 'id' | 'status'> {
    return { id, status };
}

describe('computeProfileStats', () => {
    it('compte joués/scorés/bons/exacts/ratés et la précision', () => {
        const predictions = predictionMap(['exact', 'good', 'good', 'missed', 'pending']);
        const matches = [...predictions.keys()].map((id) => match(id, 'finished'));
        expect(computeProfileStats(predictions, matches)).toEqual({
            played: 5,
            scored: 4,
            good: 3,
            exact: 1,
            missed: 1,
            notPredicted: 0,
            precisionPct: 75,
        });
    });

    it('compte les matchs terminés sans prono comme occasions manquées dans la précision', () => {
        const predictions = predictionMap(['good']);
        const stats = computeProfileStats(predictions, [
            match('m0', 'finished'),
            match('oublié', 'finished'),
        ]);
        expect(stats.notPredicted).toBe(1);
        expect(stats.precisionPct).toBe(50);
        // Le prono raté et le match oublié restent deux catégories distinctes.
        expect(stats.missed).toBe(0);
    });

    it("ignore les matchs non terminés et ceux dont le prono attend d'être scoré", () => {
        const predictions = predictionMap(['good', 'pending']);
        const stats = computeProfileStats(predictions, [
            match('m0', 'finished'),
            match('m1', 'finished'), // prono posé mais pas encore scoré
            match('à-venir', 'scheduled'),
            match('annulé', 'cancelled'),
        ]);
        expect(stats.notPredicted).toBe(0);
        expect(stats.precisionPct).toBe(100);
    });

    it("précision null tant que rien n'est scoré ni oublié", () => {
        expect(computeProfileStats(predictionMap(['pending']), []).precisionPct).toBeNull();
        expect(computeProfileStats(new Map(), []).precisionPct).toBeNull();
        expect(
            computeProfileStats(new Map(), [match('à-venir', 'scheduled')]).precisionPct,
        ).toBeNull();
    });

    it('précision 0 quand seuls des matchs terminés sans prono existent', () => {
        const stats = computeProfileStats(new Map(), [match('oublié', 'finished')]);
        expect(stats.notPredicted).toBe(1);
        expect(stats.precisionPct).toBe(0);
    });
});
