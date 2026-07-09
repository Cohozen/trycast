import { describe, expect, it } from 'vitest';

import { betterThanFilter, markTies } from './ranking';

describe('markTies', () => {
    it('marque les rangs partagés, simples comme triples', () => {
        const marked = markTies([
            { rank: 1 },
            { rank: 2 },
            { rank: 2 },
            { rank: 4 },
            { rank: 4 },
            { rank: 4 },
            { rank: 7 },
        ]);
        expect(marked.map((entry) => entry.tie)).toEqual([
            false,
            true,
            true,
            true,
            true,
            true,
            false,
        ]);
    });

    it('ne marque rien sans égalité', () => {
        expect(markTies([{ rank: 1 }, { rank: 2 }]).every((entry) => !entry.tie)).toBe(true);
        expect(markTies([])).toEqual([]);
    });
});

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
