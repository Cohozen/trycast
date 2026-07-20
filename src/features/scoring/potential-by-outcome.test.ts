import { describe, expect, it } from 'vitest';

import { BAREME_V2 } from './bareme';
import {
    impliedProbabilities,
    probabilityTone,
    winnerPointsByOutcome,
} from './potential-by-outcome';

describe('winnerPointsByOutcome', () => {
    it('calcule 15 × cote pour chaque issue', () => {
        const points = winnerPointsByOutcome({ home: 1.3, draw: 18, away: 3.4 }, BAREME_V2);
        expect(points).toEqual({ home: 20, draw: 270, away: 51 });
    });

    it('arrondit au point entier malgré les flottants IEEE 754 (15 × 1.15 → 17)', () => {
        const points = winnerPointsByOutcome({ home: 1.15, draw: 20, away: 5 }, BAREME_V2);
        expect(points.home).toBe(17);
    });

    it('replie sur fallbackOdds quand une cote manque ou est invalide', () => {
        const points = winnerPointsByOutcome({ home: null, draw: 0, away: 2.5 }, BAREME_V2);
        expect(points).toEqual({ home: 30, draw: 30, away: 38 });
    });
});

describe('impliedProbabilities', () => {
    it('normalise les inverses des cotes (somme = 1, favori en tête)', () => {
        const probs = impliedProbabilities({ home: 1.3, draw: 18, away: 3.4 });
        expect(probs).not.toBeNull();
        const { home, draw, away } = probs!;
        expect(home + draw + away).toBeCloseTo(1, 10);
        expect(home).toBeGreaterThan(away);
        expect(away).toBeGreaterThan(draw);
    });

    it('retourne null si une cote manque ou est invalide', () => {
        expect(impliedProbabilities({ home: null, draw: 18, away: 3.4 })).toBeNull();
        expect(impliedProbabilities({ home: 1.3, draw: 0, away: 3.4 })).toBeNull();
    });
});

describe('probabilityTone', () => {
    it.each([
        [0.75, 'success'],
        [0.4, 'success'],
        [0.39, 'warning'],
        [0.25, 'warning'],
        [0.24, 'danger'],
        [0.05, 'danger'],
    ] as const)('%d → %s', (probability, tone) => {
        expect(probabilityTone(probability)).toBe(tone);
    });
});
