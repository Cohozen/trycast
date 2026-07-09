import { describe, expect, it } from 'vitest';
import { parsePredictedScore, validatePredictedScore } from './validation';

describe('validatePredictedScore', () => {
    it('accepte les entiers positifs, zéro compris', () => {
        expect(validatePredictedScore('0')).toBeNull();
        expect(validatePredictedScore('24')).toBeNull();
        expect(validatePredictedScore(' 17 ')).toBeNull();
    });

    it('refuse le vide', () => {
        expect(validatePredictedScore('')).toBe('predictions:validation.missingScore');
        expect(validatePredictedScore('   ')).toBe('predictions:validation.missingScore');
    });

    it.each([['-3'], ['3.5'], ['abc'], ['12a'], ['+5']])('refuse %s', (raw) => {
        expect(validatePredictedScore(raw)).toBe('predictions:validation.invalidScore');
    });
});

describe('parsePredictedScore', () => {
    it('parse un champ validé', () => {
        expect(parsePredictedScore('24')).toBe(24);
        expect(parsePredictedScore(' 0 ')).toBe(0);
    });
});
