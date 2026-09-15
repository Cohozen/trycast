import { describe, expect, it } from 'vitest';

import { distributionPercentages } from './distribution-percentages';

function distribution(home: number, draw: number, away: number) {
    return { home, draw, away, total: home + draw + away };
}

describe('distributionPercentages', () => {
    it('null quand personne n’a pronostiqué', () => {
        expect(distributionPercentages(distribution(0, 0, 0))).toBeNull();
    });

    it('cas rond sans reste', () => {
        expect(distributionPercentages(distribution(1, 1, 2))).toEqual({
            home: 25,
            draw: 25,
            away: 50,
        });
    });

    it('somme toujours à 100 malgré les arrondis (plus fort reste)', () => {
        // 1/3 chacun : 33.33… → deux issues à 33, la première au plus fort reste à 34.
        const thirds = distributionPercentages(distribution(1, 1, 1));
        expect(thirds).not.toBeNull();
        expect((thirds?.home ?? 0) + (thirds?.draw ?? 0) + (thirds?.away ?? 0)).toBe(100);
        // 2/7, 2/7, 3/7 = 28.57, 28.57, 42.86 → 29 + 28 + 43 (ou équivalent sommant à 100).
        const sevenths = distributionPercentages(distribution(2, 2, 3));
        expect((sevenths?.home ?? 0) + (sevenths?.draw ?? 0) + (sevenths?.away ?? 0)).toBe(100);
        expect(sevenths?.away).toBe(43);
    });

    it('issue unanime = 100 %', () => {
        expect(distributionPercentages(distribution(0, 0, 5))).toEqual({
            home: 0,
            draw: 0,
            away: 100,
        });
    });
});
