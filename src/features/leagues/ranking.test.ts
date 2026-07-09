import { describe, expect, it } from 'vitest';

import { betterThanFilter } from './ranking';

describe('betterThanFilter', () => {
    it('reproduit les tie-breakers de la RPC (total > exacts > moins de pronos)', () => {
        const filter = betterThanFilter({
            total_points: 120,
            exact_scores: 3,
            predictions_scored: 14,
        });
        expect(filter).toBe(
            'total_points.gt.120,' +
                'and(total_points.eq.120,exact_scores.gt.3),' +
                'and(total_points.eq.120,exact_scores.eq.3,predictions_scored.lt.14)',
        );
    });
});
